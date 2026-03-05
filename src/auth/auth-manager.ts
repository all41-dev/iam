import passport from "passport";
import { NextFunction, Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import querystring from "querystring";
import express from "express";
import { Strategy as JWTStrategy } from "passport-jwt";
import Cors from "cors";
import { AuthController } from "../api/controllers/controller-auth";
import cookieParser from "cookie-parser";
import { IAMUser, IAuthOptions } from "../interfaces";
import bcrypt from 'bcrypt';
import { DbUser } from '../db/db-user';
import { DbRefreshToken } from '../db/db-refresh-token';
import { AuthUtils } from "./auth-utils";
import { Op } from "sequelize";

const BCRYPT_ROUNDS = 12;

export class AuthManager {
  private static instance: AuthManager;
  private authOptions: IAuthOptions;

  private constructor(options: IAuthOptions) {
    this.authOptions = options;
  }

  public get options() {
    return this.authOptions;
  }

  public static getInstance(options?: IAuthOptions) {
    if (!AuthManager.instance) {
      if (!options) {
        throw new Error("AuthManager not initialized");
      }
      AuthManager.instance = new AuthManager(options);
    }
    return AuthManager.instance;
  }

  public getCookieOptions(maxAge: number): { maxAge: number; httpOnly: boolean; secure: boolean; sameSite: 'strict' | 'lax' | 'none' } {
    return {
      maxAge,
      httpOnly: true,
      secure: this.authOptions.secureCookies !== false,
      sameSite: 'lax',
    };
  }

  public isAllowedRedirect(url: string, req: Request): boolean {
    try {
      const base = `${req.protocol}://${req.get("host")}`;
      const parsed = new URL(url, base);

      if (parsed.hostname === req.hostname) {
        return true;
      }

      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return false;
      }

      const allowedDomains = this.authOptions.allowedRedirectDomains;
      if (!allowedDomains || allowedDomains.length === 0) {
        return false;
      }

      return allowedDomains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
    } catch {
      return false;
    }
  }

  public init() {
    const router = Router();
    router.use(cookieParser());

    router.use(express.json());

    const corsOptions: Cors.CorsOptions = {
      credentials: true,
      origin: this.authOptions.allowedOrigins || false,
    };
    router.use(Cors(corsOptions));

    passport.use(
      new JWTStrategy(
        {
          jwtFromRequest: this.cookieExtractor,
          secretOrKey: this.authOptions.privateKey ? this.authOptions.privateKey : this.authOptions.publicKey,
          algorithms: ["RS256"],
          issuer: this.options.authIssuer || "all41",
          audience: this.options.authAudience || "all41",
        },
        async (payload, done) => {
          done(null, payload);
        }
      )
    );

    for (const strategy in this.authOptions.strategies) {
      passport.use(strategy, this.authOptions.strategies[strategy]);
    }

    const strategyNames = Object.keys(this.authOptions.strategies);
    this.refreshToken = this.authOptions.refreshToken || this.refreshToken;
    return new AuthController().create(strategyNames, router);
  }

  public authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization && this.authOptions.masterApiKey) {
      const bearer = req.headers.authorization.split(" ");
      if (bearer.length === 2 && bearer[0] === "Bearer") {
        const apiKey = bearer[1];
        if (apiKey === this.authOptions.masterApiKey) {
          return next();
        }
      }
    }
    passport.authenticate(
      "jwt",
      { session: false },
      async (error: any, token: any) => {
        if (error) return res.sendStatus(401);
        if (!token) {
          if (!req.cookies["auth"] && !req.cookies["refresh"]) {
            return res.sendStatus(401);
          }
          token = await this.refreshToken(req);
          if (!token) return res.sendStatus(401);
          res.cookie("auth", token.token, this.getCookieOptions(5 * 60 * 1000));
        }
        req.user = token.user;
        next();
      }
    )(req, res, next);
  };

  public refreshToken = async (req: Request): Promise<{ user: any, token: string } | undefined> => {
    let refreshToken = req.cookies.refresh;
    if (!refreshToken) {
      if (!req.body || !req.body.refreshToken) {
        return;
      }
      refreshToken = req.body.refreshToken;
    }
    const token = await this.generateAccessToken(refreshToken);
    if (!token) return;
    return token;
  };

  public generateJWT(redirectUrl?: string): (req: Request, res: Response) => Promise<any> {
    return async (req: Request, res: Response) => {
      if (!this.options.privateKey) {
        throw new Error("No private key provided for JWT generation");
      }
      if (!req.user) {
        throw new Error("No user found in request");
      }
      const safePayload = this.createSafeJwtPayload(req.user as IAMUser);
      const token = jwt.sign(safePayload, this.options.privateKey, {
        algorithm: "RS256",
        expiresIn: "5m",
        issuer: process.env.AUTH_ISSUER || "all41",
        audience: process.env.AUTH_AUDIENCE || "all41",
        subject: (req.user as IAMUser).uuid,
      });

      const refreshExpiry = 24 * 60 * 60 * 1000;
      const refreshToken = await this.saveRefreshToken(
        (req.user as IAMUser).uuid,
        refreshExpiry,
        (req.user as IAMUser).impersonateUser
      );
      let redirectAfter = req.cookies["redirect"] || redirectUrl || "/";
      const redirect = req.cookies["redirect"] || redirectUrl || "/";

      if (!this.isAllowedRedirect(redirect, req)) {
        redirectAfter = "/";
      }

      const base = `${req.protocol}://${req.get("host")}`;
      const isExternalHost = new URL(redirectAfter, base).hostname !== req.hostname;
      if (isExternalHost && req.cookies["redirect"]) {
        redirectAfter +=
          "?" + querystring.stringify({ accessToken: token, refreshToken, provider: (req.user as IAMUser).provider });
      }
      res.clearCookie("redirect");
      res.cookie("auth", token, this.getCookieOptions(5 * 60 * 1000));
      res.cookie("refresh", refreshToken, this.getCookieOptions(refreshExpiry));
      res.cookie("provider", (req.user as IAMUser).provider, { ...this.getCookieOptions(refreshExpiry + 15 * 60 * 1000), httpOnly: false });
      res.redirect(redirectAfter);
    };
  }

  public cookieExtractor(req: Request) {
    const token = (req && req.cookies) ? req.cookies["auth"] : null;
    return token;
  }

  public saveRefreshToken = async (user_uuid: string, refreshExpiry?: number, impersonate_user_email?: string) => {
    if (!this.options.privateKey) {
      throw new Error("No private key provided for JWT generation");
    }
    const user = await DbUser.findByPk(user_uuid)
    if (!user) throw new Error("User not found");
    const token = jwt.sign(
      {
        user_uuid: user.uuid,
        impersonate_user_email: impersonate_user_email ? impersonate_user_email : undefined
      },
      this.options.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: refreshExpiry ? refreshExpiry / 1000 : '1d',
        issuer: process.env.AUTH_ISSUER || "all41",
        audience: process.env.AUTH_AUDIENCE || "all41",
        subject: user.uuid
      });

    const hash = await new Promise<string>((resolve, reject) => {
      bcrypt.hash(token, BCRYPT_ROUNDS, (err, hashed) => {
        if (err) return reject(err);
        resolve(hashed);
      });
    });
    await DbRefreshToken.create({
      user_uuid: user.uuid,
      token: hash,
      expires: new Date(Date.now() + (refreshExpiry || 24 * 60 * 60 * 1000))
    });
    return token;
  };
  public generateAccessToken = async (refreshToken: string) => {
    if (!this.options.privateKey) {
      throw new Error("No private key provided for JWT generation");
    }
    let decodedToken: { user_uuid: string; impersonate_user_email?: string } | null = null;
    try {
      decodedToken = (jwt.verify(refreshToken, this.options.publicKey, { algorithms: ['RS256'] }) as { user_uuid: string, impersonate_user_email?: string });
    } catch (err) {
      return null;
    }
    if (!decodedToken) return null
    const token = await DbRefreshToken.findAll({
      where: {
        user_uuid: decodedToken.user_uuid, expires: {
          [Op.gt]: new Date()
        }
      }
    })
      .then((tokens) => tokens.find((t) => bcrypt.compareSync(refreshToken, t.token)));
    if (!token) return null;
    const user = await DbUser.findByPk(token.user_uuid);
    if (!user) return null;
    const permissions = decodedToken.impersonate_user_email
      ? await AuthUtils.getInstance().getUserPermissions(undefined, decodedToken.impersonate_user_email)
      : await AuthUtils.getInstance().getUserPermissions(user.uuid);
    const safePayload = this.createSafeJwtPayload({
      ...user.dataValues,
      impersonateUser: decodedToken.impersonate_user_email,
      permissions: permissions && Object.keys(permissions).length > 0 ? Buffer.from(JSON.stringify(permissions)).toString('base64') : undefined,
      permissionWarning: permissions && Object.keys(permissions).length > 0 ? undefined : 'no permissions',
    });
    const newToken = jwt.sign(safePayload, this.options.privateKey, {
      algorithm: "RS256",
      expiresIn: "5m",
      issuer: this.options.authIssuer || "all41",
      audience: this.options.authAudience || "all41",
      subject: user.uuid,
    }
    );
    return { user: safePayload.user, token: newToken };
  };

  public revokeRefreshToken = async (refreshToken: string) => {
    const decodedToken = jwt.verify(refreshToken, this.options.publicKey, { algorithms: ['RS256'] }) as { id: string };
    const user_uuid = decodedToken.id;

    const token = await DbRefreshToken.findAll({ where: { user_uuid } })
      .then((tokens) => tokens.find((t) => bcrypt.compareSync(refreshToken, t.token)));
    await DbRefreshToken.destroy({ where: { uuid: token?.uuid } });
  };

  private createSafeJwtPayload(user: IAMUser) {
    const MAX_JWT_PAYLOAD_SIZE = 2 * 1024;
    const estimatePayloadSize = (payload: object) =>
      Buffer.byteLength(JSON.stringify(payload), "utf8");
    const originalUser = { ...user };
    let payload = { user: originalUser };
    if (estimatePayloadSize(payload) > MAX_JWT_PAYLOAD_SIZE) {
      payload = {
        user: {
          ...originalUser,
          permissions: undefined,
          permissionWarning:
            "Permissions omitted due to token size limit. See /api/users/:id/permission for full list.",
        },
      };
    }
    return payload;
  }
}

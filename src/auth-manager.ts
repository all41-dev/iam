import passport from "passport";
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import querystring from "querystring";
import express from "express";
import { Strategy as JWTStrategy } from "passport-jwt";
import Cors from "cors";
import { AuthController } from "./api/controllers/controller-auth";
import cookieParser from "cookie-parser";
import { IAuthOptions } from "./interfaces";
import bcrypt from 'bcrypt';
import { AuthUserTable } from './db/auth-user-table';
import { RefreshTokenTable } from './db/refresh-token-table';
import { RefreshExpiryTable } from './db/refresh-expiry-table';

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

  public init() {
    const router = Router();
    router.use(cookieParser());

    router.use(express.json());

    router.use(
      Cors({
        credentials: true,
      })
    );

    passport.use(
      "jwtAuth",
      new JWTStrategy(
        {
          jwtFromRequest: this.cookieExtractor,
          secretOrKey: this.authOptions.publicKey,
          algorithms: ["RS256"],
          issuer: process.env.AUTH_ISSUER || "all41",
          audience: process.env.AUTH_AUDIENCE || "all41",
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

    //TODO: look at the usage
    this.refreshToken = this.authOptions.refreshToken || this.refreshToken;

    return new AuthController().create(strategyNames, router);
  }

  public authMiddleware = (req: Request, res: Response, next: any) => {
    if (req.headers.authorization) {
      const bearer = req.headers.authorization.split(" ");
      if (bearer.length === 2 && bearer[0] === "Bearer") {
        const apiKey = bearer[1];
        if (apiKey === this.authOptions.masterApiKey) {
          return next();
        }
      }
    }
    passport.authenticate(
      "jwtAuth",
      { session: false },
      async (error: any, token: any) => {
        if (error || !token) {
          // try to refresh token
          if (!req.cookies["auth"] && !req.cookies["refresh"]) {
            return res.sendStatus(401);
          }
          token = await this.refreshToken(req, res);
        }
        if (!token) return res.sendStatus(401);
        req.user = { user: token.user };
        next();
      }
    )(req, res, next);
  };

  public refreshToken = async (req: Request, res: Response) => {
    let refreshToken = req.cookies.refresh;
    let refreshTokenCookie = true;
    if (!refreshToken) {
      if (!req.body || !req.body.refreshToken) {
        res.sendStatus(401);
        return;
      }
      refreshToken = req.body.refreshToken;
      refreshTokenCookie = false;
    }

    const token = await this.generateAccessToken(refreshToken);
    if (!token) {
      if (!refreshTokenCookie) res.sendStatus(401);
      return;
    }

    if (refreshTokenCookie) {
      res.cookie("auth", token.token, { maxAge: 5 * 60 * 1000 });
    } else {
      res.json(token);
      return;
    }
    return token;
  };

  public generateJWT(
    redirectUri?: string
  ): (req: Request, res: Response) => Promise<any> {
    return async (req: Request, res: Response) => {
      if (!this.options.privateKey) {
        throw new Error("No private key provided for JWT generation");
      }
      if (!req.user) {
        throw new Error("No user found in request");
      }
      const refreshExpiry = this.getRefreshExpiry
        ? await this.getRefreshExpiry(req)
        : 24 * 60 * 60 * 1000;
      const accessToken = jwt.sign(
        { user: req.user },
        this.options.privateKey,
        {
          algorithm: "RS256",
          expiresIn: "5m",
          issuer: process.env.AUTH_ISSUER || "all41",
          audience: process.env.AUTH_AUDIENCE || "all41",
          subject: (req.user as any).uuid,
        }
      );
      const refreshToken = await this.saveRefreshToken(
        (req.user as { uuid: string }).uuid,
        refreshExpiry
      );
      let redirectAfter = redirectUri || "/";
      if (req.cookies["redirect"]) {
        redirectAfter = req.cookies["redirect"];
        res.clearCookie("redirect");
        res.clearCookie("failureRedirect");
        redirectAfter +=
          "?" + querystring.stringify({ accessToken, refreshToken });
      } else {
        res.cookie("auth", accessToken, { maxAge: 5 * 60 * 1000 });
        res.cookie("refresh", refreshToken, { maxAge: refreshExpiry });
      }
      res.redirect(redirectAfter || "/");
    };
  }

  public cookieExtractor(req: Request) {
    let token = null;
    if (req && req.cookies) token = req.cookies["auth"];
    return token;
  }

  public saveRefreshToken = async (authUserUuid: string, refreshExpiry?: number) => {
    const authUser = await AuthUserTable.findByPk(authUserUuid)
    if (!authUser) throw new Error("User not found");
    const token = jwt.sign(
      { id: authUser.uuid },
      this.options.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: refreshExpiry ? refreshExpiry / 1000 : '1d',
        issuer: process.env.AUTH_ISSUER,
        audience: process.env.AUTH_AUDIENCE, subject: authUser.uuid
      });
    bcrypt.hash(token, 10, async (err, hash) => {
      if (err) throw err;
      await RefreshTokenTable.create({
        authUserUuid: authUser.uuid,
        token: hash,
        expires: new Date(Date.now() + (refreshExpiry || 24 * 60 * 60 * 1000))
      });
    });
    return token;
  };

  public generateAccessToken = async (refreshToken: string) => {
    const authUserUuid = (jwt.verify(refreshToken, this.options.publicKey, { algorithms: ['RS256'] }) as { id: string }).id;
    const token = await RefreshTokenTable.findAll({ where: { authUserUuid } })
      .then((tokens) => tokens.find((t) => bcrypt.compareSync(refreshToken, t.token)));

    if (!token) return null;
    const user = await AuthUserTable.findByPk(token.authUserUuid);
    if (!user) return null;

    const newToken = jwt.sign(
      { user: user.dataValues },
      this.options.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '1m',
        issuer: this.options.authIssuer,
        audience: this.options.authAudience,
        subject: user.uuid,
      }
    );
    return { user: user.dataValues, token: newToken };
  };

  public revokeRefreshToken = async (refreshToken: string) => {
    const decodedToken = jwt.verify(refreshToken, this.options.publicKey, { algorithms: ['RS256'] }) as { id: string };
    const authUserUuid = decodedToken.id;

    const token = await RefreshTokenTable.findAll({ where: { authUserUuid } })
      .then((tokens) => tokens.find((t) => bcrypt.compareSync(refreshToken, t.token)));
    await RefreshTokenTable.destroy({ where: { uuid: token?.uuid } });
  };

  /**TODO: check if there is no issue with the RefreshExpiryTable in IAM API with customer uuid
   * @deprecated 
  */
  public getRefreshExpiry = async (req: Request) => {
    const customerUuid = req.cookies.customerUuid;
    if (!customerUuid) return 24 * 60 * 60 * 1000;
    const expiry = await RefreshExpiryTable.findOne({ where: { customerUuid } });
    if (!expiry) return 24 * 60 * 60 * 1000;
    return expiry.expiryTime;
  };
  /**
     * @deprecated 
    */
  public additionalParams = async (req: Request, res: Response) => {
    const customerUuid = req.query.customerUuid;
    if (customerUuid) res.cookie('customerUuid', customerUuid, { maxAge: 5 * 60 * 1000 });
  };
}

import passport from "passport";
import { NextFunction, Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import express from "express";
import { Strategy as JWTStrategy } from "passport-jwt";
import Cors from "cors";
import bcrypt from "bcrypt";
import { AuthController } from "../api/controllers/controller-auth";
import cookieParser from "cookie-parser";
import {
  AccessTokenResult,
  ExchangeResult,
  IAMUser,
  IAuthOptions,
  IssuedRefreshToken,
  RefreshFailureCode,
  RefreshOutcome,
} from "../interfaces";
import { DbUser } from "../db/db-user";
import { DbRefreshToken } from "../db/db-refresh-token";
import { DbAuthCode } from "../db/db-auth-code";
import { AuthUtils } from "./auth-utils";
import { Op } from "sequelize";
import crypto from "crypto";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** Lifetimes in milliseconds. */
export const ACCESS_TOKEN_LIFETIME = 5 * MINUTE;
/** A session lasts this long from sign-in; rotating its refresh token never extends it. */
export const REFRESH_TOKEN_LIFETIME = DAY;
export const AUTH_CODE_LIFETIME = 60 * 1000;

interface RefreshClaims {
  user_uuid: string;
  impersonate_user_email?: string;
  jti?: string;
}

interface RefreshFamily {
  uuid: string;
  createdAt: Date;
}

interface FoundRefreshRow {
  row: DbRefreshToken;
  claims: RefreshClaims;
  /** Issued before the jti claim existed: bcrypt-hashed, no family. */
  legacy: boolean;
}

/**
 * A token is stored as its SHA-256. bcrypt reads only the first 72 bytes of its input, and on a
 * JWT those never reach a claim that differs between two tokens of one user.
 */
const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

const hashMatches = (stored: string | undefined, token: string): boolean => {
  if (!stored) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(hashToken(token));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

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
      async (error: any, token: any, info: any) => {
        if (error) return res.status(401).json({ code: "TOKEN_INVALID" });
        if (!token) {
          const hasAccess = Boolean(req.cookies?.["auth"]);
          const hasRefresh = Boolean(req.cookies?.["refresh"]);
          if (!hasAccess && !hasRefresh) {
            return res.status(401).json({ code: "NO_SESSION" });
          }
          const refreshed = await this.refreshToken(req);
          if (!refreshed) {
            const expired = !hasAccess || info?.name === "TokenExpiredError";
            return res.status(401).json({ code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID" });
          }
          res.cookie("auth", refreshed.token, { maxAge: ACCESS_TOKEN_LIFETIME });
          token = refreshed;
        }
        req.user = token.user;
        next();
      }
    )(req, res, next);
  };

  /**
   * The implicit refresh: a new access token from the refresh token in the cookie or the body.
   * The refresh token is not rotated, so a client that cannot store a new cookie (a WebSocket
   * upgrade) keeps a valid one.
   */
  public refreshToken = async (req: Request): Promise<{ user: any, token: string } | undefined> => {
    const presented = req.cookies?.["refresh"] || req.body?.refreshToken;
    if (!presented) return;
    return (await this.generateAccessToken(presented)) ?? undefined;
  };

  public generateJWT(redirectUrl?: string): (req: Request, res: Response) => Promise<any> {
    return async (req: Request, res: Response) => {
      if (!this.options.privateKey) {
        throw new Error("No private key provided for JWT generation");
      }
      if (!req.user) {
        throw new Error("No user found in request");
      }
      const user = req.user as IAMUser;
      const redirect: string = req.cookies["redirect"] || redirectUrl || "/";
      const base = `${req.protocol}://${req.get("host")}`;
      const target = new URL(redirect, base);
      const isExternalHost = target.hostname !== req.hostname;
      res.clearCookie("redirect");
      const toExternalFront = isExternalHost && Boolean(req.cookies["redirect"]);
      if (toExternalFront && this.options.externalLogin === "code") {
        // No cookie and no token: the front's own host redeems the code through POST /exchange.
        const code = await this.issueAuthCode(user, target);
        const callback = new URL("/auth/callback", target);
        callback.searchParams.set("code", code);
        return res.redirect(callback.href);
      }
      const access = this.signAccessToken(this.createSafeJwtPayload(user), user.uuid);
      const refresh = await this.issueRefreshToken(user.uuid, user.impersonateUser);
      const refreshMaxAge = refresh.expires.getTime() - Date.now();
      let landing = redirect;
      if (toExternalFront) {
        const url = new URL(redirect, base);
        url.searchParams.set("accessToken", access.token);
        url.searchParams.set("refreshToken", refresh.token);
        url.searchParams.set("provider", user.provider);
        landing = url.href;
      }
      res.cookie("auth", access.token, { maxAge: ACCESS_TOKEN_LIFETIME });
      res.cookie("refresh", refresh.token, { maxAge: refreshMaxAge });
      res.cookie("provider", user.provider, { maxAge: refreshMaxAge + 15 * MINUTE });
      res.redirect(landing);
    };
  }

  public cookieExtractor(req: Request) {
    const token = (req && req.cookies) ? req.cookies["auth"] : null;
    return token;
  }

  /** A new refresh token family: a sign-in. Expired rows of every user go on the way. */
  public issueRefreshToken = async (userUuid: string, impersonateUserEmail?: string): Promise<IssuedRefreshToken> => {
    if (!this.options.privateKey) {
      throw new Error("No private key provided for JWT generation");
    }
    const user = await DbUser.findByPk(userUuid);
    if (!user) throw new Error("User not found");
    await DbRefreshToken.destroy({ where: { expires: { [Op.lt]: new Date() } } });
    return this.mintRefreshToken(user.uuid, impersonateUserEmail, { uuid: crypto.randomUUID(), createdAt: new Date() });
  };

  /** A new access token for a live refresh token; null for one unknown, expired, reused or whose user is gone. */
  public generateAccessToken = async (refreshToken: string): Promise<AccessTokenResult | null> => {
    const found = await this.findRefreshRow(refreshToken);
    if (typeof found === "string") return null;
    const payload = await this.buildUserPayload(found.row.user_uuid, found.claims.impersonate_user_email);
    if (!payload) return null;
    const access = this.signAccessToken(payload, found.row.user_uuid);
    return {
      user: payload.user,
      token: access.token,
      accessToken: access.token,
      accessExpiresAt: access.expiresAt.toISOString(),
    };
  };

  /**
   * The explicit refresh: the presented token is retired and a new one of the same family
   * answers, expiring with the sign-in. A retired token presented again revokes every token
   * of the user.
   */
  public rotateRefreshToken = async (refreshToken: string): Promise<RefreshOutcome> => {
    const found = await this.findRefreshRow(refreshToken);
    if (typeof found === "string") return { ok: false, code: found };
    const { row, claims, legacy } = found;
    const payload = await this.buildUserPayload(row.user_uuid, claims.impersonate_user_email);
    if (!payload) return { ok: false, code: "REFRESH_INVALID" };
    const family: RefreshFamily = legacy
      ? { uuid: crypto.randomUUID(), createdAt: new Date(new Date(row.expires).getTime() - REFRESH_TOKEN_LIFETIME) }
      : { uuid: row.family_uuid!, createdAt: new Date(row.family_created_at!) };
    const next = await this.mintRefreshToken(row.user_uuid, claims.impersonate_user_email, family);
    if (legacy) {
      await DbRefreshToken.destroy({ where: { uuid: row.uuid } });
    } else {
      await DbRefreshToken.update({ rotated_at: new Date() }, { where: { jti: row.jti } });
    }
    const access = this.signAccessToken(payload, row.user_uuid);
    return {
      ok: true,
      user: payload.user,
      token: access.token,
      accessToken: access.token,
      accessExpiresAt: access.expiresAt.toISOString(),
      refreshToken: next.token,
      refreshExpiresAt: next.expires.toISOString(),
    };
  };

  /** Logout: the row of the presented token goes. A token that cannot be read is ignored. */
  public revokeRefreshToken = async (refreshToken: string): Promise<void> => {
    let claims: RefreshClaims;
    try {
      claims = jwt.verify(refreshToken, this.options.publicKey, { algorithms: ["RS256"], ignoreExpiration: true }) as RefreshClaims;
    } catch {
      return;
    }
    if (!claims?.user_uuid) return;
    const row = claims.jti
      ? await DbRefreshToken.findOne({ where: { jti: claims.jti } }).then((r) => (r && hashMatches(r.token, refreshToken) ? r : undefined))
      : await this.findLegacyRow(refreshToken, claims.user_uuid, false);
    if (!row) return;
    await DbRefreshToken.destroy({ where: { uuid: row.uuid } });
  };

  /** A one-time code for an external front, redeemed within AUTH_CODE_LIFETIME by exchangeAuthCode. */
  public issueAuthCode = async (user: IAMUser, target: URL): Promise<string> => {
    await DbAuthCode.destroy({ where: { expires: { [Op.lt]: new Date() } } });
    const code = crypto.randomBytes(32).toString("base64url");
    await DbAuthCode.create({
      code_hash: hashToken(code),
      user_uuid: user.uuid,
      impersonate_user_email: user.impersonateUser ?? null,
      provider: user.provider,
      redirect_path: `${target.pathname}${target.search}${target.hash}`,
      expires: new Date(Date.now() + AUTH_CODE_LIFETIME),
    });
    return code;
  };

  /** Redeems a code once: the row is claimed by its delete before any token is minted. */
  public exchangeAuthCode = async (code: string): Promise<ExchangeResult | null> => {
    if (!code) return null;
    const code_hash = hashToken(code);
    const row = await DbAuthCode.findOne({ where: { code_hash } });
    if (!row) return null;
    const claimed = await DbAuthCode.destroy({ where: { code_hash } });
    if (claimed === 0 || new Date(row.expires).getTime() <= Date.now()) return null;
    const impersonate = row.impersonate_user_email ?? undefined;
    const payload = await this.buildUserPayload(row.user_uuid, impersonate);
    if (!payload) return null;
    const refresh = await this.issueRefreshToken(row.user_uuid, impersonate);
    const access = this.signAccessToken(payload, row.user_uuid);
    return {
      accessToken: access.token,
      accessExpiresAt: access.expiresAt.toISOString(),
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expires.toISOString(),
      provider: row.provider,
      redirectPath: row.redirect_path,
    };
  };

  private claimsOptions(): { issuer: string; audience: string } {
    return {
      issuer: this.options.authIssuer || process.env.AUTH_ISSUER || "all41",
      audience: this.options.authAudience || process.env.AUTH_AUDIENCE || "all41",
    };
  }

  private signAccessToken(payload: { user: IAMUser }, subject: string): { token: string; expiresAt: Date } {
    if (!this.options.privateKey) {
      throw new Error("No private key provided for JWT generation");
    }
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_LIFETIME);
    const token = jwt.sign(payload, this.options.privateKey, {
      algorithm: "RS256",
      expiresIn: ACCESS_TOKEN_LIFETIME / 1000,
      ...this.claimsOptions(),
      subject,
    });
    return { token, expiresAt };
  }

  private async mintRefreshToken(userUuid: string, impersonateUserEmail: string | undefined, family: RefreshFamily): Promise<IssuedRefreshToken> {
    if (!this.options.privateKey) {
      throw new Error("No private key provided for JWT generation");
    }
    const now = Date.now();
    const expires = new Date(family.createdAt.getTime() + REFRESH_TOKEN_LIFETIME);
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      {
        user_uuid: userUuid,
        impersonate_user_email: impersonateUserEmail ? impersonateUserEmail : undefined,
      },
      this.options.privateKey,
      {
        algorithm: "RS256",
        expiresIn: Math.max(1, Math.floor((expires.getTime() - now) / 1000)),
        ...this.claimsOptions(),
        subject: userUuid,
        jwtid: jti,
      });
    await DbRefreshToken.create({
      jti,
      user_uuid: userUuid,
      token: hashToken(token),
      expires,
      family_uuid: family.uuid,
      family_created_at: family.createdAt,
      rotated_at: null,
    });
    return { token, expires };
  }

  private async findRefreshRow(refreshToken: string): Promise<FoundRefreshRow | RefreshFailureCode> {
    let claims: RefreshClaims;
    try {
      claims = jwt.verify(refreshToken, this.options.publicKey, { algorithms: ["RS256"], ...this.claimsOptions() }) as RefreshClaims;
    } catch (err) {
      return err instanceof jwt.TokenExpiredError ? "REFRESH_EXPIRED" : "REFRESH_INVALID";
    }
    if (!claims?.user_uuid) return "REFRESH_INVALID";
    if (!claims.jti) {
      const legacyRow = await this.findLegacyRow(refreshToken, claims.user_uuid, true);
      return legacyRow ? { row: legacyRow, claims, legacy: true } : "REFRESH_INVALID";
    }
    const row = await DbRefreshToken.findOne({ where: { jti: claims.jti } });
    if (!row || !hashMatches(row.token, refreshToken)) return "REFRESH_INVALID";
    if (row.rotated_at) {
      await DbRefreshToken.destroy({ where: { user_uuid: row.user_uuid } });
      return "REFRESH_REUSED";
    }
    if (new Date(row.expires).getTime() <= Date.now()) {
      await DbRefreshToken.destroy({ where: { jti: claims.jti } });
      return "REFRESH_EXPIRED";
    }
    return { row, claims, legacy: false };
  }

  /**
   * A token issued before the jti claim: its row has no jti and holds a bcrypt hash, so the
   * user's rows are scanned. Such rows are gone a day after release.
   */
  private async findLegacyRow(refreshToken: string, userUuid: string, liveOnly: boolean): Promise<DbRefreshToken | undefined> {
    const live = liveOnly ? { expires: { [Op.gt]: new Date() } } : {};
    const rows = await DbRefreshToken.findAll({ where: { user_uuid: userUuid, jti: null, ...live } });
    return rows.find((r) => bcrypt.compareSync(refreshToken, r.token));
  }

  private async buildUserPayload(userUuid: string, impersonateUserEmail?: string): Promise<{ user: IAMUser } | null> {
    const user = await DbUser.findByPk(userUuid);
    if (!user) return null;
    const permissions = impersonateUserEmail
      ? await AuthUtils.getInstance().getUserPermissions(undefined, impersonateUserEmail)
      : await AuthUtils.getInstance().getUserPermissions(user.uuid);
    const hasPermissions = permissions && Object.keys(permissions).length > 0;
    return this.createSafeJwtPayload({
      ...user.dataValues,
      impersonateUser: impersonateUserEmail,
      permissions: hasPermissions ? Buffer.from(JSON.stringify(permissions)).toString("base64") : undefined,
      permissionWarning: hasPermissions ? undefined : "no permissions",
    });
  }

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

import { Strategy } from "passport";
import { NextFunction, Request, Response } from "express";

export interface IAuthOptions {
  trustProxy?: boolean;
  redirectAfterLogin?: string;
  redirectAfterLogout?: string;
  strategies: { [key: string]: Strategy };
  privateKey?: string;
  publicKey: string;
  masterApiKey?: string;
  authIssuer?: string;
  authAudience?: string;
  additionalElementProfile?: (req: Request, res: Response, next: NextFunction) => Promise<any>;
  additionalParams?: (req: Request, res: Response) => Promise<void>;
  refreshToken?: (
    req: Request
  ) => Promise<{ user: any; token: string } | undefined>;
  /**
   * How a sign-in lands on a front of another host. "tokens" (default) appends them to the
   * redirect URL; "code" sends a one-time code its host redeems through POST /exchange.
   */
  externalLogin?: "tokens" | "code";
}

export interface IUtilsOptions {
  scopeElementAncestor: (uuid: string, code: string) => Promise<string[]>;
  scopeElementHierarchy: (code?: string, uuid?: string) => Promise<any[]>;
}

export interface PermissionContext {
  uuid: string;
  scope: string;
  status: string;
  type: "direct" | "ancestor";
  feature_code?: string
}

export interface IAMUser {
  uuid: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  provider: string;
  permissions?: any;
  permissionWarning?: string;
  impersonateUser?: string;
}
export type AuthFailureCode = "NO_SESSION" | "TOKEN_INVALID" | "TOKEN_EXPIRED";

export type RefreshFailureCode = "REFRESH_INVALID" | "REFRESH_EXPIRED" | "REFRESH_REUSED";

export interface AccessTokenResult {
  user: any;
  /** Alias of accessToken, kept for one release. */
  token: string;
  accessToken: string;
  /** ISO 8601, UTC. */
  accessExpiresAt: string;
}

export interface IssuedRefreshToken {
  token: string;
  expires: Date;
}

export interface RefreshResult extends AccessTokenResult {
  refreshToken: string;
  /** ISO 8601, UTC. */
  refreshExpiresAt: string;
}

export type RefreshOutcome = ({ ok: true } & RefreshResult) | { ok: false; code: RefreshFailureCode };

export interface ExchangeResult {
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
  provider: string;
  /** Path on the front's own origin, never a scheme or a host. */
  redirectPath: string;
}

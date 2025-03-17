import { Strategy } from "passport";
import { Request, Response } from "express";

export interface IAuthOptions {
  trustProxy?: boolean;
  redirectAfterLogin?: string;
  redirectAfterLogout?: string;
  strategies: { [key: string]: Strategy };
  privateKey: string;
  publicKey: string;
  masterApiKey: string;
  authIssuer: string;
  authAudience: string;
  refreshToken?: (
    req: Request,
    res: Response
  ) => Promise<{ user: any; token: string } | undefined>;
}

export interface IUtilsOptions {
  scopeHierarchy?: (
    uuid: string,
    code: string
  ) => Promise<{ [key: string]: string }>;
}

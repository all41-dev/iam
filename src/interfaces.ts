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
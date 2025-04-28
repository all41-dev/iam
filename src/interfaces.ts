import { Strategy } from "passport";
import { Request, Response } from "express";

export interface IAuthOptions {
  trustProxy?: boolean;
  redirectAfterLogin?: string;
  redirectAfterLogout?: string;
  strategies: { [key: string]: Strategy };
  privateKey?: string;
  publicKey: string;
  masterApiKey: string;
  authIssuer: string;
  authAudience: string;
  additionalElementProfile?: (req: Request, res: Response) => Promise<any>;
  additionalParams?: (req: Request, res: Response) => Promise<void>;
  refreshToken?: (
    req: Request,
    res: Response
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
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
  saveRefreshToken: (userId: string, refreshExpiry?: number) => Promise<string>;
  generateAccessToken: (
    refreshToken: string
  ) => Promise<{ user: any; token: string } | undefined>;
  revokeRefreshToken: (refreshToken: string) => Promise<void>;
  refreshToken?: (
    req: Request,
    res: Response
  ) => Promise<{ user: any; token: string } | undefined>;
  getRefreshExpiry?: (req: Request, res: Response) => Promise<number>;
  additionalParams?: (req: Request, res: Response) => Promise<void>;
}

export interface SaveRefreshTokenParams {
  userId: string;
  refreshExpiry?: number | undefined;
  privateKey: string;
  authIssuer: string | undefined;
  authAudience: string | undefined;
}

export interface GenerateAccessTokenParams {
  refreshToken: string;
  privateKey: string;
  publicKey: string;
  authIssuer: string | undefined;
  authAudience: string | undefined;
}


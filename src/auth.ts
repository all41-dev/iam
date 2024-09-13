import passport, { Strategy } from 'passport';
import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import querystring from 'querystring';
import express from 'express';
import { Strategy as JWTStrategy } from 'passport-jwt';
import Cors from 'cors';
import { AuthController } from './controllers/auth-controller';
import cookieParser from 'cookie-parser';

export interface IAuthOptions {
  trustProxy?: boolean;
  redirectAfterLogin?: string;
  redirectAfterLogout?: string;
  strategies: { [key: string]: Strategy };
  privateKey?: string;
  publicKey: string;
  masterApiKey: string;
  saveRefreshToken: (userId: string, refreshExpiry?: number) => Promise<string>;
  generateAccessToken: (refreshToken: string) => Promise<{user: any, token: string} | undefined>;
  revokeRefreshToken: (refreshToken: string) => Promise<void>;
  refreshToken?: (req: Request, res: Response) => Promise<{ user: any; token: string; } | undefined>;
  getRefreshExpiry?: (req: Request, res: Response) => number;
  additionalParams?: (req: Request, res: Response) => Promise<void>;
}

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
        throw new Error('AuthManager not initialized');
      }
      AuthManager.instance = new AuthManager(options);
    }
    return AuthManager.instance;
  }

  public init() {
    const router = Router();
    router.use(cookieParser());

    router.use(express.json());

    router.use(Cors({
      credentials: true,
    }));

    passport.use('jwtAuth', new JWTStrategy({
      jwtFromRequest: this.cookieExtractor,
      secretOrKey: this.authOptions.publicKey,
      algorithms: ['RS256'],
      issuer: process.env.AUTH_ISSUER || 'all41',
      audience: process.env.AUTH_AUDIENCE || 'all41',
    }, async (payload, done) => {
      done(null, payload);
    }));

    for (const strategy in this.authOptions.strategies) {
      passport.use(strategy, this.authOptions.strategies[strategy]);
    }

    const strategyNames = Object.keys(this.authOptions.strategies);

    this.refreshToken = this.authOptions.refreshToken || this.refreshToken;

    return new AuthController().create(strategyNames, router);
  }

  public authMiddleware = (req: Request, res: Response, next: any) => {
    if (req.headers.authorization) {
      const bearer = req.headers.authorization.split(' ');
      if (bearer.length === 2 && bearer[0] === 'Bearer') {
        const apiKey = bearer[1];
        if (apiKey === this.authOptions.masterApiKey) {
          return next();
        }
      }
    }
    passport.authenticate('jwtAuth', { session: false }, async (error: any, token: any) => {
      if (error || !token) {
        // try to refresh token
        if (!req.cookies['auth'] && !req.cookies['refresh']) {
          return res.sendStatus(401);
        }
        token = await this.refreshToken(req, res);
      }
      if(!token) return res.sendStatus(401);
      req.user = { user: token.user };
      next();
    })(req, res, next);
  }

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

    const token = await this.options.generateAccessToken(refreshToken);
    if (!token) {
      if (!refreshTokenCookie) res.sendStatus(401);
      return;
    }

    if (refreshTokenCookie) {
      res.cookie('auth', token.token, { maxAge: 5 * 60 * 1000 });
    } else {
      res.json(token);
      return;
    }
    return token;
  }

  public generateJWT(redirectUri?: string) : (req: Request, res: Response) => Promise<any> {
    return async (req: Request, res: Response) => {
      if (!this.options.privateKey) {
        throw new Error('No private key provided for JWT generation');
      }
      if (!req.user) {
        throw new Error('No user found in request');
      }
      const refreshExpiry = this.options.getRefreshExpiry ? this.options.getRefreshExpiry(req, res) : 24 * 60 * 60 * 1000;
      const accessToken = jwt.sign({ user: req.user }, this.options.privateKey, { algorithm: 'RS256', expiresIn: '5m', issuer: process.env.AUTH_ISSUER || 'all41', audience: process.env.AUTH_AUDIENCE || 'all41', subject: (req.user as any).uuid });
      const refreshToken = await this.options.saveRefreshToken((req.user as { uuid: string }).uuid, refreshExpiry);
      let redirectAfter = redirectUri || '/';
      if (req.cookies['redirect']) {
        redirectAfter = req.cookies['redirect'];
        res.clearCookie('redirect');
        res.clearCookie('failureRedirect');
        redirectAfter += '?' + querystring.stringify({ accessToken, refreshToken });
      } else {
        res.cookie('auth', accessToken, { maxAge: 5 * 60 * 1000 });
        res.cookie('refresh', refreshToken, { maxAge: refreshExpiry });
      }
      res.redirect(redirectAfter || '/');
    };
  }

  public cookieExtractor(req: Request) {
    let token = null;
    if (req && req.cookies) {
      token = req.cookies['auth'];
    }
    return token;
  }

}
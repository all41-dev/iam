import { Router } from 'express';
import passport from 'passport';
import { AuthManager } from '../auth';
import querystring from 'querystring';
import cookieParser from 'cookie-parser';
import express from 'express';
import Cors from 'cors';

export class AuthController {

  private _authManager: AuthManager;

  constructor() {
    this._authManager = AuthManager.getInstance();
  }

  public create(strategies : string[], router?: Router): Router {
    const r = router || Router();

    strategies.forEach((strategy) => {
      r.get(`/${strategy}`, (req, res, next) => {
        const redirectUri = req.query.redirectUrl;
        const failureRedirect = req.query.failureRedirect;
        if (redirectUri) {
          res.cookie('redirect', redirectUri, { maxAge: 5 * 60 * 1000 });
        }
        if (failureRedirect) {
          res.cookie('failureRedirect', failureRedirect, { maxAge: 5 * 60 * 1000 });
        }
        next();
      }, passport.authenticate(strategy, { session: false }));

      r.get(`/${strategy}/callback`, (req, res, next) => {
        const failureRedirect = req.cookies.failureRedirect || this._authManager.options.redirectAfterLogout;
        passport.authenticate(strategy, { session: false }, (err : any, user : any, info : any) => {
          if (err) {
            return res.status(401).json({ message: err.message });
          }
          if (!user) {
            const query = querystring.stringify({ message: info.message });
            res.clearCookie('failureRedirect');
            res.clearCookie('redirect');
            return res.redirect(`${failureRedirect}?${query}`);
          }
          req.user = user;
          next();
        }
        )(req, res, next);
      }, this._authManager.generateJWT(this._authManager.options.redirectAfterLogin));
    });

    r.get('/logout', (req, res) => {
      res.clearCookie('auth');
      res.clearCookie('refresh');
      res.redirect(this._authManager.options.redirectAfterLogin || '/');
    });

    r.post('/refresh', this._authManager.refreshToken);

    r.get('/profile', this._authManager.authMiddleware, (req, res) => {
        res.json({
            username: (req.user as any).user.username,
            email: (req.user as any).user.email,
            firstName: (req.user as any).user.firstName,
            lastName: (req.user as any).user.lastName,
        });
    });

    return r;
  }

}
import { Router } from 'express';
import passport from 'passport';
import { AuthManager } from '../../auth/auth-manager';
import querystring from 'querystring';
import { AuthUtils } from '../../auth/auth-utils';
import { IAMUser } from '../../interfaces';

export class AuthController {

  private _authManager: AuthManager;
  private _authUtils: AuthUtils | undefined;

  constructor() {
    this._authManager = AuthManager.getInstance();
    try {
      this._authUtils = AuthUtils.getInstance();
    } catch {
      this._authUtils = undefined
    }
  }

  public create(strategies: string[], router?: Router): Router {
    const r = router || Router();

    strategies.forEach((strategy) => {
      r.get(`/${strategy}`, async (req, res, next) => {
        const redirectUrl = req.query.redirectUrl;
        const failureRedirect = req.query.failureRedirect;
        if (this._authManager.options.additionalParams) await this._authManager.options.additionalParams(req, res);
        if (redirectUrl) res.cookie('redirect', redirectUrl, { maxAge: 5 * 60 * 1000 });
        if (failureRedirect) res.cookie('failureRedirect', failureRedirect, { maxAge: 5 * 60 * 1000 });

        next();
      }, passport.authenticate(strategy, { session: false }));

      r.get(`/${strategy}/callback`, (req, res, next) => {
        const failureRedirect = req.cookies.failureRedirect || this._authManager.options.redirectAfterLogout;
        passport.authenticate(strategy, { session: false }, (err: any, user: any, info: any) => {
          if (err) return res.status(401).json({ message: err.message });
          if (!user) {
            const query = querystring.stringify({ message: info.message });
            res.clearCookie('failureRedirect');
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

    r.get('/profile', this._authManager.authMiddleware, async (req, res, next) => {
      if (this._authManager.options.additionalElementProfile) {
        await this._authManager.options.additionalElementProfile(req, res, next);
      } else {
        next();
      }
    }, (req, res) => {
      res.json({
        username: (req.user as IAMUser).username,
        email: (req.user as IAMUser).email,
        firstName: (req.user as IAMUser).first_name,
        lastName: (req.user as IAMUser).last_name,
        impersonateUser: (req.user as IAMUser).impersonateUser,
        permissions: (req.user as IAMUser).permissions
          ? JSON.parse(Buffer.from((req.user as IAMUser).permissions, 'base64').toString('utf8'))
          : (req.user as IAMUser).permissionWarning,
      });
    });

    r.get(`/impersonate/:email`, this._authManager.authMiddleware, async (req, res, next) => {
      if (!req.user || !this._authUtils) return res.status(401).json({ message: 'Not Authorized' });
      if (await this._authUtils.checkAccess((req.user as IAMUser).email, "global-write-rights", process.env.GLOBAL_UUID || '') === "deny")
        return res.status(403).json({ message: 'Forbidden' });
      const impersonateUser = req.params.email;
      const permissions = await this._authUtils.getUserPermissions(undefined, impersonateUser);
      const user = {
        ...req.user,
        impersonateUser: impersonateUser,
        permissions: permissions && Object.keys(permissions).length > 0 ? Buffer.from(JSON.stringify(permissions)).toString('base64') : undefined,
        permissionWarning: permissions && Object.keys(permissions).length > 0 ? undefined : 'no permissions',
      }
      req.user = user;
      next();
    }, this._authManager.generateJWT(this._authManager.options.redirectAfterLogin));

    r.get(`/depersonate`, this._authManager.authMiddleware, async (req, res, next) => {
      if (!req.user || !this._authUtils) return res.status(401).json({ message: 'Not Authorized' });
      const permissions = await this._authUtils.getUserPermissions((req.user as IAMUser).uuid)
      const user = {
        ...req.user,
        impersonateUser: undefined,
        permissions: permissions && Object.keys(permissions).length > 0 ? Buffer.from(JSON.stringify(permissions)).toString('base64') : undefined,
        permissionWarning: permissions && Object.keys(permissions).length > 0 ? undefined : 'no permissions',
      }
      req.user = user;
      next();
    }, this._authManager.generateJWT(this._authManager.options.redirectAfterLogin));

    return r;
  }
}
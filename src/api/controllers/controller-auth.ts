import { Request, Router } from 'express';
import passport from 'passport';
import { ACCESS_TOKEN_LIFETIME, AuthManager } from '../../auth/auth-manager';
import querystring from 'querystring';
import { AuthUtils } from '../../auth/auth-utils';
import { ExchangeAnswer, IAMUser, RefreshResult } from '../../interfaces';
import { allowedLanding } from '../../auth/landing';
import {
  clearLandingCookie,
  clearSessionCookies,
  setAccessCookie,
  setLandingCookie,
  setProviderCookie,
  setRefreshCookie,
} from '../../auth/session-cookies';
import { Utils } from '@all41-dev/server.types';

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
        const redirectUrl = this.landingUrl(req);
        const failureRedirect = req.query.failureRedirect?.toString();
        if (redirectUrl === null || (failureRedirect && !this.allowed(failureRedirect, req))) {
          return res.status(400).json({ code: 'REDIRECT_REFUSED' });
        }
        if (this._authManager.options.additionalParams) await this._authManager.options.additionalParams(req, res);
        if (redirectUrl) setLandingCookie(req, res, 'redirect', redirectUrl);
        if (failureRedirect) setLandingCookie(req, res, 'failureRedirect', failureRedirect);

        next();
      }, passport.authenticate(strategy, { session: false }));

      r.get(`/${strategy}/callback`, (req, res, next) => {
        const asked = this.allowed(req.cookies.failureRedirect, req) ? req.cookies.failureRedirect : undefined;
        const failureRedirect = asked || this._authManager.options.redirectAfterLogout;
        passport.authenticate(strategy, { session: false }, (err: any, user: any, info: any) => {
          if (err) return res.status(401).json({ message: err.message });
          if (!user) {
            const query = querystring.stringify({ message: info.message });
            clearLandingCookie(req, res, 'failureRedirect');
            return res.redirect(`${failureRedirect}?${query}`);
          }
          req.user = user;
          next();
        }
        )(req, res, next);
      }, this._authManager.generateJWT(this._authManager.options.redirectAfterLogin));
    });

    // The same-host client signs out through a navigation; a front behind a proxy posts.
    r.get('/logout', async (req, res) => {
      try {
        await this.revokePresented(req);
        clearSessionCookies(req, res, this._authManager.options);
        res.redirect(this._authManager.options.redirectAfterLogin || '/');
      } catch (err) {
        Utils.logger.error(`/logout error: ${err}`)
        return res.status(500).json({ message: 'Internal server error' });
      }
    });

    r.post('/logout', async (req, res) => {
      try {
        await this.revokePresented(req);
        clearSessionCookies(req, res, this._authManager.options);
        return res.sendStatus(204);
      } catch (err) {
        Utils.logger.error(`/logout error: ${err}`)
        return res.status(500).json({ message: 'Internal server error' });
      }
    });

    r.post('/refresh', async (req, res) => {
      try {
        const presented = req.body?.refreshToken || req.cookies?.refresh;
        if (!presented) {
          return res.status(401).json({ code: 'REFRESH_INVALID' });
        }
        const outcome = await this._authManager.rotateRefreshToken(presented);
        if (!outcome.ok) {
          return res.status(401).json({ code: outcome.code });
        }
        const result: RefreshResult = {
          user: outcome.user,
          token: outcome.token,
          accessToken: outcome.accessToken,
          accessExpiresAt: outcome.accessExpiresAt,
          refreshToken: outcome.refreshToken,
          refreshExpiresAt: outcome.refreshExpiresAt,
        };
        const options = this._authManager.options;
        setAccessCookie(req, res, options, result.accessToken, ACCESS_TOKEN_LIFETIME);
        setRefreshCookie(req, res, options, result.refreshToken, new Date(result.refreshExpiresAt).getTime() - Date.now());
        return res.json(result);
      } catch (err) {
        Utils.logger.error(`/refresh error: ${err}`)
        return res.status(500).json({ message: 'Internal server error' });
      }
    });

    // The front host redeems the code it was redirected with. The session is the cookies of
    // the answer, stored for whichever host the call came through; the body carries no token.
    r.post('/exchange', async (req, res) => {
      try {
        const code = req.body?.code;
        const result = typeof code === 'string' ? await this._authManager.exchangeAuthCode(code) : null;
        if (!result) {
          return res.status(400).json({ code: 'INVALID_CODE' });
        }
        const options = this._authManager.options;
        const refreshMaxAge = new Date(result.refreshExpiresAt).getTime() - Date.now();
        setAccessCookie(req, res, options, result.accessToken, ACCESS_TOKEN_LIFETIME);
        setRefreshCookie(req, res, options, result.refreshToken, refreshMaxAge);
        setProviderCookie(req, res, result.provider, refreshMaxAge);
        const answer: ExchangeAnswer = {
          provider: result.provider,
          redirectPath: result.redirectPath,
          accessExpiresAt: result.accessExpiresAt,
          refreshExpiresAt: result.refreshExpiresAt,
        };
        return res.json(answer);
      } catch (err) {
        Utils.logger.error(`/exchange error: ${err}`)
        return res.status(500).json({ message: 'Internal server error' });
      }
    });

    r.get('/profile', this._authManager.authMiddleware, async (req, res, next) => {
      if (this._authManager.options.additionalElementProfile) {
        await this._authManager.options.additionalElementProfile(req, res, next);
      } else {
        next();
      }
    }, (req, res) => {
      res.json({
        uuid: (req.user as IAMUser).uuid,
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
      try {
        if (!req.user || !this._authUtils) return res.status(401).json({ message: 'Not Authorized' });
        if (await this._authUtils.checkAccess(req.user as IAMUser, "global-write-rights", process.env.GLOBAL_UUID || '') === "deny")
          return res.status(403).json({ message: 'Forbidden' });
        const asked = req.query.redirectUrl?.toString();
        if (asked && !this.allowed(asked, req)) return res.status(400).json({ code: 'REDIRECT_REFUSED' });
        const redirectUrl = asked || this._authManager.options.redirectAfterLogin;
        const impersonateUser = req.params.email;
        const permissions = await this._authUtils.getUserPermissions(undefined, Array.isArray(impersonateUser) ? impersonateUser.join('') : impersonateUser);
        const user = {
          ...req.user,
          impersonateUser: impersonateUser,
          permissions: permissions && Object.keys(permissions).length > 0 ? Buffer.from(JSON.stringify(permissions)).toString('base64') : undefined,
          permissionWarning: permissions && Object.keys(permissions).length > 0 ? undefined : 'no permissions',
        }
        req.user = user;
        return this._authManager.generateJWT(redirectUrl)(req, res);
      } catch (err) {
        Utils.logger.error(`/impersonate/:email error: ${err}`)
        return res.status(500).json({ message: 'Internal server error' });
      }
    });

    r.get(`/depersonate`, this._authManager.authMiddleware, async (req, res, next) => {
      try {
        if (!req.user || !this._authUtils) return res.status(401).json({ message: 'Not Authorized' });
        const asked = req.query.redirectUrl?.toString();
        if (asked && !this.allowed(asked, req)) return res.status(400).json({ code: 'REDIRECT_REFUSED' });
        const redirectUrl = asked || this._authManager.options.redirectAfterLogin;
        const permissions = await this._authUtils.getUserPermissions((req.user as IAMUser).uuid)
        const user = {
          ...req.user,
          impersonateUser: undefined,
          permissions: permissions && Object.keys(permissions).length > 0 ? Buffer.from(JSON.stringify(permissions)).toString('base64') : undefined,
          permissionWarning: permissions && Object.keys(permissions).length > 0 ? undefined : 'no permissions',
        }
        req.user = user;
        return this._authManager.generateJWT(redirectUrl)(req, res);
      } catch (err) {
        Utils.logger.error(`/depersonate error: ${err}`)
        return res.status(500).json({ message: 'Internal server error' });
      }
    });

    return r;
  }

  /**
   * Where the sign-in lands. A front on another host sends its path, host and
   * scheme apart (`redirectUrl`, `redirectDomain`, `redirectScheme`); joined
   * here, the absolute URL is what makes the landing external in generateJWT.
   * Without a domain the path is kept as given, relative to the auth host.
   * Undefined when none is asked for, null for one that is not allowed.
   */
  private landingUrl(req: Request): string | null | undefined {
    const path = req.query.redirectUrl?.toString();
    if (!path) return undefined;
    const domain = req.query.redirectDomain?.toString();
    const scheme = req.query.redirectScheme?.toString() || 'https';
    let landing = path;
    if (domain) {
      try {
        landing = new URL(path, `${scheme}://${domain}`).href;
      } catch {
        return null;
      }
    }
    return this.allowed(landing, req) ? landing : null;
  }

  private allowed(landing: unknown, req: Request): boolean {
    return allowedLanding(landing, req, this._authManager.options) !== null;
  }

  private async revokePresented(req: Request): Promise<void> {
    const presented = req.cookies?.refresh || req.body?.refreshToken;
    if (presented) await this._authManager.revokeRefreshToken(presented);
  }
}

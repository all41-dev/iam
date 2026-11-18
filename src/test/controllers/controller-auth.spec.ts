import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response, Router } from 'express';
import passport from 'passport';
import { Utils } from '@all41-dev/server.types';
import { AuthController } from '../../api/controllers/controller-auth';
import { AuthManager } from '../../auth/auth-manager';
import { AuthUtils } from '../../auth/auth-utils';
import 'mocha';

type Handler = (req: Request, res: Response, next?: any) => any;

describe('AuthController session routes', () => {
  let sandbox: sinon.SinonSandbox;
  let manager: {
    options: any;
    authMiddleware: sinon.SinonStub;
    generateJWT: sinon.SinonStub;
    rotateRefreshToken: sinon.SinonStub;
    exchangeAuthCode: sinon.SinonStub;
    revokeRefreshToken: sinon.SinonStub;
  };
  let routes: Record<string, Handler[]>;
  let req: any;
  let res: any;

  /** The last handler registered on a route: the one that answers. */
  const handler = (method: string, path: string): Handler => {
    const handlers = routes[`${method} ${path}`];
    if (!handlers) throw new Error(`no route ${method} ${path}`);
    return handlers[handlers.length - 1];
  };

  /** Registers the routes of a new controller, replacing the ones held. */
  const build = () => {
    routes = {};
    const register = (method: string) => (path: string, ...handlers: Handler[]) => {
      routes[`${method} ${path}`] = handlers;
    };
    const router = { get: register('GET'), post: register('POST') } as unknown as Router;
    new AuthController().create(['github'], router);
  };

  const refusedLanding = () => {
    expect(res.status.calledOnceWithExactly(400)).to.be.true;
    expect(res.json.calledOnceWithExactly({ code: 'REDIRECT_REFUSED' })).to.be.true;
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    manager = {
      options: { redirectAfterLogin: '/home', allowedRedirectHosts: ['app.example.com', 'http://dev.example.com'] },
      authMiddleware: sandbox.stub(),
      generateJWT: sandbox.stub().returns(sandbox.stub()),
      rotateRefreshToken: sandbox.stub(),
      exchangeAuthCode: sandbox.stub(),
      revokeRefreshToken: sandbox.stub().resolves(),
    };
    sandbox.stub(AuthManager, 'getInstance').returns(manager as unknown as AuthManager);
    sandbox.stub(AuthUtils, 'getInstance').throws(new Error('not initialised'));
    sandbox.stub(Utils.logger, 'error');

    build();

    req = {
      cookies: {},
      body: {},
      query: {},
      params: {},
      protocol: 'https',
      secure: true,
      hostname: 'auth.example.com',
      get: (header: string) => (header === 'host' ? 'auth.example.com' : ''),
    };
    res = {
      status: sandbox.stub().returnsThis(),
      json: sandbox.stub().returnsThis(),
      sendStatus: sandbox.stub().returnsThis(),
      cookie: sandbox.stub().returnsThis(),
      clearCookie: sandbox.stub().returnsThis(),
      redirect: sandbox.stub(),
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('registers the sign-in, callback and session routes', () => {
    expect(Object.keys(routes)).to.include.members([
      'GET /github', 'GET /github/callback', 'GET /logout', 'POST /logout', 'POST /refresh', 'POST /exchange', 'GET /profile',
    ]);
  });

  describe('GET /<strategy>', () => {
    let next: sinon.SinonStub;

    /** The first handler stores the landing before passport takes over. */
    const start = () => {
      next = sandbox.stub();
      return routes['GET /github'][0](req, res, next);
    };

    const refused = () => {
      refusedLanding();
      expect(res.cookie.called).to.be.false;
      expect(next.called).to.be.false;
    };

    it('joins path, domain and scheme into one absolute landing for an external front', async () => {
      req.query = { redirectUrl: '/home', redirectDomain: 'app.example.com', redirectScheme: 'https' };

      await start();

      expect(res.cookie.calledWith('redirect', 'https://app.example.com/home')).to.equal(true);
    });

    it('assumes https when the scheme is not given', async () => {
      req.query = { redirectUrl: '/home', redirectDomain: 'app.example.com' };

      await start();

      expect(res.cookie.calledWith('redirect', 'https://app.example.com/home')).to.equal(true);
    });

    it('keeps a bare path for a same-host front', async () => {
      req.query = { redirectUrl: '/home' };

      await start();

      expect(res.cookie.calledWith('redirect', '/home')).to.equal(true);
    });

    it('stores no landing when none was asked for', async () => {
      await start();

      expect(res.cookie.calledWith('redirect')).to.equal(false);
      expect(next.calledOnce).to.be.true;
    });

    it('stores the landing cookies hidden from scripts, lax and secure', async () => {
      req.query = { redirectUrl: '/home', failureRedirect: '/login' };

      await start();

      const attributes = { path: '/', sameSite: 'lax', secure: true, httpOnly: true, maxAge: 5 * 60 * 1000 };
      expect(res.cookie.calledWithExactly('redirect', '/home', attributes)).to.be.true;
      expect(res.cookie.calledWithExactly('failureRedirect', '/login', attributes)).to.be.true;
    });

    it('accepts an absolute landing on the auth host, whatever the port', async () => {
      req.query = { redirectUrl: 'https://auth.example.com:8443/front/' };

      await start();

      expect(res.cookie.calledWith('redirect', 'https://auth.example.com:8443/front/')).to.be.true;
    });

    it('accepts a listed origin over http', async () => {
      req.query = { redirectUrl: '/home', redirectDomain: 'dev.example.com', redirectScheme: 'http' };

      await start();

      expect(res.cookie.calledWith('redirect', 'http://dev.example.com/home')).to.be.true;
    });

    it('refuses a domain that is not listed', async () => {
      req.query = { redirectUrl: '/home', redirectDomain: 'evil.example' };

      await start();

      refused();
    });

    it('refuses a listed host over http', async () => {
      req.query = { redirectUrl: '/home', redirectDomain: 'app.example.com', redirectScheme: 'http' };

      await start();

      refused();
    });

    it('refuses an absolute redirectUrl to another host, with or without a domain', async () => {
      req.query = { redirectUrl: 'https://evil.example/home' };
      await start();
      refused();

      res.status.resetHistory();
      res.json.resetHistory();
      req.query = { redirectUrl: 'https://evil.example/home', redirectDomain: 'app.example.com' };
      await start();
      refused();
    });

    it('refuses a scheme-relative path and a backslash path', async () => {
      req.query = { redirectUrl: '//evil.example/home' };
      await start();
      refused();

      res.status.resetHistory();
      res.json.resetHistory();
      req.query = { redirectUrl: '/\\evil.example/home' };
      await start();
      refused();
    });

    it('refuses a domain that hides another host behind credentials', async () => {
      req.query = { redirectUrl: '/home', redirectDomain: 'app.example.com@evil.example' };

      await start();

      refused();
    });

    it('refuses a domain that does not parse', async () => {
      req.query = { redirectUrl: '/home', redirectDomain: 'not a host' };

      await start();

      refused();
    });

    it('refuses a failure landing on another host and stores nothing', async () => {
      req.query = { redirectUrl: '/home', failureRedirect: 'https://evil.example/login' };

      await start();

      refused();
    });
  });

  describe('GET /<strategy>/callback', () => {
    const fail = (info = { message: 'denied' }) => {
      sandbox.stub(passport, 'authenticate').callsFake(((strategy: string, options: any, callback: any) =>
        () => callback(null, false, info)) as any);
      return routes['GET /github/callback'][0](req, res, sandbox.stub());
    };

    beforeEach(() => {
      manager.options.redirectAfterLogout = '/login';
    });

    it('sends a failed sign-in to the failure landing it asked for', () => {
      req.cookies.failureRedirect = 'https://app.example.com/login';

      fail();

      expect(res.redirect.calledOnceWithExactly('https://app.example.com/login?message=denied')).to.be.true;
      expect(res.clearCookie.calledWith('failureRedirect')).to.be.true;
    });

    it('falls back to redirectAfterLogout for a failure landing that is not allowed', () => {
      req.cookies.failureRedirect = 'https://evil.example/login';

      fail();

      expect(res.redirect.calledOnceWithExactly('/login?message=denied')).to.be.true;
    });
  });

  describe('POST /logout', () => {
    it('revokes the refresh cookie, clears the cookies and answers 204', async () => {
      req.cookies.refresh = 'refresh-token';
      await handler('POST', '/logout')(req, res);
      expect(manager.revokeRefreshToken.calledOnceWithExactly('refresh-token')).to.be.true;
      expect(res.clearCookie.args.map((a: string[]) => a[0])).to.deep.equal(['auth', 'refresh', 'provider']);
      expect(res.sendStatus.calledOnceWithExactly(204)).to.be.true;
      expect(res.redirect.called).to.be.false;
    });

    it('clears each cookie with the attributes it was set with', async () => {
      manager.options.httpOnlyTokens = true;
      await handler('POST', '/logout')(req, res);
      const token = { path: '/', sameSite: 'lax', secure: true, httpOnly: true };
      expect(res.clearCookie.calledWithExactly('auth', token)).to.be.true;
      expect(res.clearCookie.calledWithExactly('refresh', token)).to.be.true;
      expect(res.clearCookie.calledWithExactly('provider', { ...token, httpOnly: false })).to.be.true;
    });

    it('reads the token from the body too', async () => {
      req.body.refreshToken = 'body-token';
      await handler('POST', '/logout')(req, res);
      expect(manager.revokeRefreshToken.calledOnceWithExactly('body-token')).to.be.true;
      expect(res.sendStatus.calledOnceWithExactly(204)).to.be.true;
    });

    it('answers 204 with nothing to revoke', async () => {
      await handler('POST', '/logout')(req, res);
      expect(manager.revokeRefreshToken.called).to.be.false;
      expect(res.sendStatus.calledOnceWithExactly(204)).to.be.true;
    });

    it('answers 500 when the revoke throws', async () => {
      req.cookies.refresh = 'refresh-token';
      manager.revokeRefreshToken.rejects(new Error('db down'));
      await handler('POST', '/logout')(req, res);
      expect(res.status.calledOnceWithExactly(500)).to.be.true;
      expect(res.sendStatus.called).to.be.false;
    });
  });

  describe('GET /logout', () => {
    it('revokes, clears the cookies and redirects to redirectAfterLogin', async () => {
      req.cookies.refresh = 'refresh-token';
      await handler('GET', '/logout')(req, res);
      expect(manager.revokeRefreshToken.calledOnceWithExactly('refresh-token')).to.be.true;
      expect(res.clearCookie.args.map((a: string[]) => a[0])).to.deep.equal(['auth', 'refresh', 'provider']);
      expect(res.redirect.calledOnceWithExactly('/home')).to.be.true;
    });
  });

  describe('POST /refresh', () => {
    const result = {
      user: { uuid: 'user-uuid' },
      token: 'access',
      accessToken: 'access',
      accessExpiresAt: new Date(Date.now() + 300000).toISOString(),
      refreshToken: 'next-refresh',
      refreshExpiresAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
    };

    it('answers 401 REFRESH_INVALID without a token', async () => {
      await handler('POST', '/refresh')(req, res);
      expect(manager.rotateRefreshToken.called).to.be.false;
      expect(res.status.calledOnceWithExactly(401)).to.be.true;
      expect(res.json.calledOnceWithExactly({ code: 'REFRESH_INVALID' })).to.be.true;
    });

    it('passes the refusal code on with 401', async () => {
      req.cookies.refresh = 'old';
      manager.rotateRefreshToken.resolves({ ok: false, code: 'REFRESH_REUSED' });
      await handler('POST', '/refresh')(req, res);
      expect(res.status.calledOnceWithExactly(401)).to.be.true;
      expect(res.json.calledOnceWithExactly({ code: 'REFRESH_REUSED' })).to.be.true;
      expect(res.cookie.called).to.be.false;
    });

    it('answers the tokens, sets both cookies and prefers the body over the cookie', async () => {
      req.cookies.refresh = 'cookie-token';
      req.body.refreshToken = 'body-token';
      manager.rotateRefreshToken.resolves({ ok: true, ...result });

      await handler('POST', '/refresh')(req, res);

      expect(manager.rotateRefreshToken.calledOnceWithExactly('body-token')).to.be.true;
      expect(res.json.calledOnceWithExactly(result)).to.be.true;
      expect(res.cookie.calledWith('auth', 'access', sinon.match.has('maxAge'))).to.be.true;
      expect(res.cookie.calledWith('refresh', 'next-refresh', sinon.match.has('maxAge'))).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('answers 500 when the rotation throws', async () => {
      req.cookies.refresh = 'old';
      manager.rotateRefreshToken.rejects(new Error('db down'));
      await handler('POST', '/refresh')(req, res);
      expect(res.status.calledOnceWithExactly(500)).to.be.true;
    });
  });

  describe('POST /exchange', () => {
    const result = {
      accessToken: 'access',
      accessExpiresAt: new Date().toISOString(),
      refreshToken: 'refresh',
      refreshExpiresAt: new Date().toISOString(),
      provider: 'github',
      redirectPath: '/home',
    };

    it('answers 400 INVALID_CODE without a code', async () => {
      await handler('POST', '/exchange')(req, res);
      expect(manager.exchangeAuthCode.called).to.be.false;
      expect(res.status.calledOnceWithExactly(400)).to.be.true;
      expect(res.json.calledOnceWithExactly({ code: 'INVALID_CODE' })).to.be.true;
    });

    it('answers 400 INVALID_CODE for a code that is not a string', async () => {
      req.body.code = 42;
      await handler('POST', '/exchange')(req, res);
      expect(manager.exchangeAuthCode.called).to.be.false;
      expect(res.status.calledOnceWithExactly(400)).to.be.true;
    });

    it('answers 400 INVALID_CODE for a refused code', async () => {
      req.body.code = 'the-code';
      manager.exchangeAuthCode.resolves(null);
      await handler('POST', '/exchange')(req, res);
      expect(manager.exchangeAuthCode.calledOnceWithExactly('the-code')).to.be.true;
      expect(res.status.calledOnceWithExactly(400)).to.be.true;
      expect(res.json.calledOnceWithExactly({ code: 'INVALID_CODE' })).to.be.true;
    });

    it('sets the session cookies for the calling host and answers no token', async () => {
      req.body.code = 'the-code';
      const refreshExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      manager.exchangeAuthCode.resolves({ ...result, refreshExpiresAt });
      await handler('POST', '/exchange')(req, res);
      expect(res.json.calledOnceWithExactly({
        provider: 'github',
        redirectPath: '/home',
        accessExpiresAt: result.accessExpiresAt,
        refreshExpiresAt,
      })).to.be.true;
      expect(res.status.called).to.be.false;
      expect(res.cookie.calledWith('auth', 'access')).to.be.true;
      expect(res.cookie.calledWith('refresh', 'refresh')).to.be.true;
      expect(res.cookie.calledWith('provider', 'github')).to.be.true;
      const refreshMaxAge = res.cookie.getCalls().find((c: any) => c.args[0] === 'refresh').args[2].maxAge;
      expect(refreshMaxAge).to.be.within(59 * 60 * 1000, 60 * 60 * 1000);
    });

    it('sets lax cookies, secure on https, the tokens readable by scripts unless httpOnlyTokens is set', async () => {
      req.body.code = 'the-code';
      manager.exchangeAuthCode.resolves(result);
      await handler('POST', '/exchange')(req, res);
      const attributes = (name: string) => res.cookie.getCalls().find((c: any) => c.args[0] === name).args[2];
      for (const name of ['auth', 'refresh', 'provider']) {
        expect(attributes(name)).to.include({ path: '/', sameSite: 'lax', secure: true, httpOnly: false });
      }

      res.cookie.resetHistory();
      manager.options.httpOnlyTokens = true;
      await handler('POST', '/exchange')(req, res);
      expect(attributes('auth').httpOnly).to.be.true;
      expect(attributes('refresh').httpOnly).to.be.true;
      expect(attributes('provider').httpOnly).to.be.false;
    });

    it('leaves the cookies without Secure on a plain http request', async () => {
      req.secure = false;
      req.body.code = 'the-code';
      manager.exchangeAuthCode.resolves(result);
      await handler('POST', '/exchange')(req, res);
      expect(res.cookie.getCalls().every((c: any) => c.args[2].secure === false)).to.be.true;
    });

    it('answers 500 when the exchange throws', async () => {
      req.body.code = 'the-code';
      manager.exchangeAuthCode.rejects(new Error('db down'));
      await handler('POST', '/exchange')(req, res);
      expect(res.status.calledOnceWithExactly(500)).to.be.true;
    });
  });

  it('GET /profile answers the user uuid beside the names', () => {
    req.user = { uuid: 'user-uuid', username: 'jdoe', email: 'j@example.com', first_name: 'J', last_name: 'Doe' };
    handler('GET', '/profile')(req, res);
    expect(res.json.firstCall.args[0]).to.include({ uuid: 'user-uuid', username: 'jdoe', firstName: 'J', lastName: 'Doe' });
  });

  describe('impersonation landings', () => {
    let land: sinon.SinonStub;

    beforeEach(() => {
      (AuthUtils.getInstance as sinon.SinonStub).restore();
      sandbox.stub(AuthUtils, 'getInstance').returns({
        checkAccess: sandbox.stub().resolves('grant'),
        getUserPermissions: sandbox.stub().resolves({}),
      } as unknown as AuthUtils);
      land = sandbox.stub();
      manager.generateJWT.returns(land);
      build();
      // The callback route takes its own landing handler when the routes are registered.
      manager.generateJWT.resetHistory();
      req.user = { uuid: 'user-uuid' };
      req.params.email = 'other@example.com';
    });

    for (const path of ['/impersonate/:email', '/depersonate']) {
      it(`GET ${path} refuses a redirectUrl on another host`, async () => {
        req.query = { redirectUrl: 'https://evil.example/home' };
        await handler('GET', path)(req, res);
        refusedLanding();
        expect(manager.generateJWT.called).to.be.false;
      });

      it(`GET ${path} lands on an allowed redirectUrl`, async () => {
        req.query = { redirectUrl: 'https://app.example.com/home' };
        await handler('GET', path)(req, res);
        expect(manager.generateJWT.calledOnceWithExactly('https://app.example.com/home')).to.be.true;
        expect(land.calledOnce).to.be.true;
      });

      it(`GET ${path} lands on redirectAfterLogin when none is asked for`, async () => {
        await handler('GET', path)(req, res);
        expect(manager.generateJWT.calledOnceWithExactly('/home')).to.be.true;
      });
    }
  });
});

import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response, Router } from 'express';
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

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    manager = {
      options: { redirectAfterLogin: '/home' },
      authMiddleware: sandbox.stub(),
      generateJWT: sandbox.stub().returns(sandbox.stub()),
      rotateRefreshToken: sandbox.stub(),
      exchangeAuthCode: sandbox.stub(),
      revokeRefreshToken: sandbox.stub().resolves(),
    };
    sandbox.stub(AuthManager, 'getInstance').returns(manager as unknown as AuthManager);
    sandbox.stub(AuthUtils, 'getInstance').throws(new Error('not initialised'));
    sandbox.stub(Utils.logger, 'error');

    routes = {};
    const register = (method: string) => (path: string, ...handlers: Handler[]) => {
      routes[`${method} ${path}`] = handlers;
    };
    const router = { get: register('GET'), post: register('POST') } as unknown as Router;
    new AuthController().create(['github'], router);

    req = { cookies: {}, body: {}, query: {}, params: {} };
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
    /** The first handler stores the landing before passport takes over. */
    const start = () => routes['GET /github'][0](req, res, sandbox.stub());

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

    it('answers the exchange result and sets no cookie', async () => {
      req.body.code = 'the-code';
      manager.exchangeAuthCode.resolves(result);
      await handler('POST', '/exchange')(req, res);
      expect(res.json.calledOnceWithExactly(result)).to.be.true;
      expect(res.cookie.called).to.be.false;
      expect(res.status.called).to.be.false;
    });

    it('answers 500 when the exchange throws', async () => {
      req.body.code = 'the-code';
      manager.exchangeAuthCode.rejects(new Error('db down'));
      await handler('POST', '/exchange')(req, res);
      expect(res.status.calledOnceWithExactly(500)).to.be.true;
    });
  });
});

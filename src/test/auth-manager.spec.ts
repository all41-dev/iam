import { expect } from 'chai';
import sinon from 'sinon';
import passport from 'passport';
import {
  ACCESS_TOKEN_LIFETIME,
  AUTH_CODE_LIFETIME,
  AuthManager,
  REFRESH_TOKEN_LIFETIME,
} from '../auth/auth-manager';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { DbAuthCode } from '../db/db-auth-code';
import { DbUser } from '../db/db-user';
import { DbRefreshToken } from '../db/db-refresh-token';
import { IAMUser, IAuthOptions } from '../interfaces';
import jwt from 'jsonwebtoken';
import express, { Request, Response, Router } from "express";
import { AuthUtils } from '../auth/auth-utils';
import { AuthController } from '../api/controllers/controller-auth';
import { Strategy as JWTStrategy } from "passport-jwt";
import 'mocha';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

describe('AuthManager Tests', () => {
  const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAtco4GwreeIbHkxmosfF0wm+KIZoEHhyeLBa8A44xPLOX89c5
otGQ5utqPPefn0n2+LZGIhYucvuthHNeCsiTH20gRKUi+CUSA50l1kAnCbbph3Fv
aU5elEy+dSSOSh+8zsHaVauim0Ghde9r65BA8HwQ3G2cc6eg9byhzCuHOE/p2lDl
aAN6x/ejy9tVwNYR8oI80BhaKqIGn/RH1QV0Uj5toO/AAdLgOHPy8z4J3XsPYRCI
xkpHhEI39Xw8gvz4SXxUm//NkmQBrFsZwM1POhhDYvJBFE9CVtrBA6VF5dbZzXae
dblb24rBcUsDwIz5q+ang3gQBGfhwdemK0NqYQIDAQABAoIBAQCOX5zHWSDZZj1h
sKPVERTvvqmBHX2CE8mxH/EKG8/mCYXFXFdwdA63O8KNkyX5e9Un/qE4ywR/2yqP
ZEdPzLykzTOLb4XOsEHGgMoEXWP1kMKe6DFoWQ9ruBsl5YZm+SpHB722gOCuFZ2d
nvB3oheqAJC4AkSYs701GBHjtGeHqoDfbIF0eobXs1rPc7eOy+ZuCwdsilTPo5Bf
UeT0woPKIXYOXy8EFImyUKUHvzgSVYrT73hcSt3+68S2fxy7ZALcaHnb2Ir5VYpb
FYAH0044+xKxgVV0XmQI/eDYdM8nSnSN6okmmk25HmO/gxawxDrwyIjfsRPwew9X
ucrayi9BAoGBAPsOJpBsQf6znaWqqe7IAaE0akof/woK9ZB8JNlvUFqmUdWAHJR2
/u3Tzmz38KfVvOoJyi3CFU3wNqKfC2/bH9udosWX/eW9ulmmGa0DGo/RwQEOoO2F
RBpwDi92hKwmrXN3i3iNvKC2KG3pjt1LnHzGvKpG7dnVYYAJiJwn54hZAoGBALle
0x5wVOwgHIM8RzVFz8VWhzRm6+8Mtr2tkn2zeOB9fPXREQea6QaS5m+FOVLXFJSl
vmLl5+yyQak6HJyzwCHzewB6RGBph+gXpzOlYHtD4oKkVsxLt2L6ZVr63zHb4eci
YD4Gkvd9Pt6yDQI2YUZKYW2r5Nf8C9+9CpS9uLFJAoGBAPJWJXmRVl7iyJDq3V/F
pnUSYGsu2YO7MnEGtJdCcOEf3KxnHq9c8hVmN8NNzfpkQhfz3TowN1plPofZWDPf
46+dSUrMvWOvsZrpz60G6vPauCAqG8NKuYN/mOHN2KFIMHPd+D4lKuhDDWGTarlI
TETRnboL/3ofFB+AlGKPzln5AoGAN9qlnF9Wh0tpq/Vms1uUri5TUOvOHVpkWaTK
JgwE2QeWtm7HRdZcbnmm62VmD1r1PZDvW9dQWZagiEAVTPYwZ0p4/nzYy4AgzkMK
Q1qKRrn+r0SbTrVlzXILRi2fQOOzHrTR8P6EHARmBC38E3WVO9u/nY8UxiuQ3FqW
rJi55NkCgYEAxm024pcAAhBcLZuANoiCQG2HJyIhbw/kX9sDs3y6xa4Po2DlQ09h
wXw6fMqBVf3woZHI//Fl6UrFyIQPfblNkRxY/E+YX7W6uAnEDpQU16iANAzv9iZF
TwfdDm63fYSYhaYcZ+IYXujX/mQj/MPlxRLNSF67WZAGKFt5qcZDtAI=
-----END RSA PRIVATE KEY-----`;
  const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtco4GwreeIbHkxmosfF0
wm+KIZoEHhyeLBa8A44xPLOX89c5otGQ5utqPPefn0n2+LZGIhYucvuthHNeCsiT
H20gRKUi+CUSA50l1kAnCbbph3FvaU5elEy+dSSOSh+8zsHaVauim0Ghde9r65BA
8HwQ3G2cc6eg9byhzCuHOE/p2lDlaAN6x/ejy9tVwNYR8oI80BhaKqIGn/RH1QV0
Uj5toO/AAdLgOHPy8z4J3XsPYRCIxkpHhEI39Xw8gvz4SXxUm//NkmQBrFsZwM1P
OhhDYvJBFE9CVtrBA6VF5dbZzXaedblb24rBcUsDwIz5q+ang3gQBGfhwdemK0Nq
YQIDAQAB
-----END PUBLIC KEY-----`;

  const authOptions: IAuthOptions = {
    publicKey,
    privateKey,
    masterApiKey: 'masterApiKey',
    authIssuer: 'authIssuer',
    authAudience: 'authAudience',
    strategies: {
      testStrategy: { authenticate: sinon.stub() } as any,
      anotherStrategy: { authenticate: sinon.stub() } as any,
    },
  };

  let sandbox: sinon.SinonSandbox;
  let fakeAuthUtils: Partial<AuthUtils>;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fakeAuthUtils = {
      checkAccess: sandbox.stub().resolves("grant"),
      getUserPermissions: sandbox.stub(),
    };
    sandbox.stub(AuthUtils, 'getInstance').returns(fakeAuthUtils as AuthUtils);

    AuthManager.getInstance(authOptions);
  });

  afterEach(() => {
    sandbox.restore();
  });


  it('should throw an error if called without initializing options', () => {
    (AuthManager as any).instance = undefined;
    expect(() => AuthManager.getInstance()).to.throw("AuthManager not initialized");
  });

  it('should return the same instance when called multiple times', () => {
    const instance1 = AuthManager.getInstance(authOptions);
    const instance2 = AuthManager.getInstance();
    expect(instance1).to.equal(instance2);
  });

  it('should initialize with the correct options', () => {
    const instance = AuthManager.getInstance(authOptions);
    expect(instance.options).to.deep.equal(authOptions);
  });

  describe('init', () => {
    let routerStub: sinon.SinonStub;
    let passportUseStub: sinon.SinonStub;
    let authControllerStub: sinon.SinonStub;

    beforeEach(() => {
      const mockRouter = {
        use: sandbox.stub(),
        get: sandbox.stub(),
      } as unknown as Router;

      routerStub = sandbox.stub(express, 'Router').returns(mockRouter);
      passportUseStub = sandbox.stub(passport, 'use');
      authControllerStub = sandbox.stub(AuthController.prototype, 'create').returns(mockRouter);
    })

    afterEach(() => {
      sandbox.restore();
    });

    it('should initialize the router and middleware correctly', () => {
      const instance = AuthManager.getInstance(authOptions);
      const router = instance.init();

      sandbox.assert.calledOnce(routerStub);

      sandbox.assert.calledWith(router.use as sinon.SinonStub, sinon.match.func);
      sandbox.assert.calledWith(router.use as sinon.SinonStub, sinon.match.func);
      sandbox.assert.calledWith(router.use as sinon.SinonStub, sinon.match.func);

      expect(router.get).to.be.a('function');
    });

    it('should initialize the router and middleware correctly without all options', () => {
      (AuthManager as any).instance = undefined;
      const mockAuthOptions: IAuthOptions = {
        publicKey,
        masterApiKey: 'masterApiKey',
        strategies: {
          testStrategy: { authenticate: sinon.stub() } as any,
          anotherStrategy: { authenticate: sinon.stub() } as any,
        },
      };
      const mockInstance = AuthManager.getInstance(mockAuthOptions);
      const router = mockInstance.init();

      sandbox.assert.calledOnce(routerStub);

      sandbox.assert.calledWith(router.use as sinon.SinonStub, sinon.match.func);
      sandbox.assert.calledWith(router.use as sinon.SinonStub, sinon.match.func);
      sandbox.assert.calledWith(router.use as sinon.SinonStub, sinon.match.func);

      expect(router.get).to.be.a('function');
      (AuthManager as any).instance = undefined;
    });


    it('should configure passport with JWTStrategy and strategies', () => {
      AuthManager.getInstance(authOptions).init();

      sandbox.assert.calledWith(
        passportUseStub,
        sandbox.match.instanceOf(passport.Strategy)
      );

      sandbox.assert.callCount(passportUseStub, Object.keys(authOptions.strategies).length + 1);
    });

    it('should call AuthController.create with correct arguments', () => {
      const strategies = Object.keys(authOptions.strategies);
      const router = AuthManager.getInstance(authOptions).init();

      sandbox.assert.calledOnce(authControllerStub);
      sandbox.assert.calledWith(authControllerStub, strategies, router);
    });

    it('should configure passport with each strategy in authOptions', () => {
      AuthManager.getInstance(authOptions).init();
      const strategies = Object.keys(authOptions.strategies);
      strategies.forEach((strategy) => {
        sinon.assert.calledWith(passportUseStub, strategy, authOptions.strategies[strategy]);
      });
    });

    it('should invoke JWTStrategy callback and call done with payload', async () => {
      AuthManager.getInstance(authOptions).init();

      const jwtStrategyCall = passportUseStub.getCalls().find(call =>
        call.args[0] instanceof JWTStrategy
      );

      expect(jwtStrategyCall).to.exist;
      const strategy = jwtStrategyCall!.args[0] as JWTStrategy;

      const verifyFn = (strategy as any)._verify;

      const fakePayload = { userId: '123' };
      const doneStub = sinon.stub();

      await verifyFn(fakePayload, doneStub);

      sinon.assert.calledOnceWithExactly(doneStub, null, fakePayload);
    });

  });

  describe('authMiddleware', () => {
    let instance: AuthManager;
    let req: Request;
    let res: Response;
    let next: sinon.SinonStub;
    let passportAuthenticateStub: sinon.SinonStub;

    const flush = () => new Promise((resolve) => setImmediate(resolve));

    const answer = (token: any, info?: any, error: any = null) => {
      passportAuthenticateStub.callsFake((strategy, options, callback) => {
        return (req: Request, res: Response, next: any) => {
          callback(error, token, info);
        };
      });
    };

    const refused = (code: string) => {
      expect((res.status as sinon.SinonStub).calledOnceWithExactly(401)).to.be.true;
      expect((res.json as sinon.SinonStub).calledOnceWithExactly({ code })).to.be.true;
      expect(next.called).to.be.false;
    };

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      req = {
        headers: {},
        cookies: {},
        body: {},
      } as Request;
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
        cookie: sinon.stub().returnsThis(),
        headersSent: false
      } as unknown as Response;
      next = sinon.stub();
      passportAuthenticateStub = sandbox.stub(passport, 'authenticate');
      answer(null);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('answers TOKEN_INVALID when passport reports an error', async () => {
      answer(null, undefined, new Error('Invalid token'));
      instance.authMiddleware(req, res, next);
      await flush();
      refused('TOKEN_INVALID');
    });

    it('lets the master API key through without passport', () => {
      req.headers.authorization = `Bearer ${authOptions.masterApiKey}`;
      instance.authMiddleware(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(passportAuthenticateStub.called).to.be.false;
    });

    it('sets req.user from a valid access token', async () => {
      answer({ user: { uuid: 'test-user' } });
      instance.authMiddleware(req, res, next);
      await flush();
      expect(req.user).to.deep.equal({ uuid: 'test-user' });
      expect(next.calledOnce).to.be.true;
    });

    it('answers NO_SESSION without any cookie', async () => {
      instance.authMiddleware(req, res, next);
      await flush();
      refused('NO_SESSION');
    });

    it('answers TOKEN_EXPIRED when only a refresh cookie is there and the refresh fails', async () => {
      req.cookies = { refresh: 'refresh-token' };
      sandbox.stub(instance, 'refreshToken').resolves(undefined);
      instance.authMiddleware(req, res, next);
      await flush();
      refused('TOKEN_EXPIRED');
    });

    it('answers TOKEN_EXPIRED when the access token expired and the refresh fails', async () => {
      req.cookies = { auth: 'stale', refresh: 'refresh-token' };
      answer(null, { name: 'TokenExpiredError' });
      sandbox.stub(instance, 'refreshToken').resolves(undefined);
      instance.authMiddleware(req, res, next);
      await flush();
      refused('TOKEN_EXPIRED');
    });

    it('answers TOKEN_INVALID when the access token is malformed and the refresh fails', async () => {
      req.cookies = { auth: 'garbage' };
      answer(null, { name: 'JsonWebTokenError' });
      sandbox.stub(instance, 'refreshToken').resolves(undefined);
      instance.authMiddleware(req, res, next);
      await flush();
      refused('TOKEN_INVALID');
    });

    it('refreshes, sets the auth cookie and goes on when the access token fails', async () => {
      req.cookies = { refresh: 'refresh-token' };
      const refreshed = { user: { uuid: 'test-user' }, token: 'new-access-token' };
      sandbox.stub(instance, 'refreshToken').resolves(refreshed);
      instance.authMiddleware(req, res, next);
      await flush();
      expect((res.cookie as sinon.SinonStub).calledWith('auth', 'new-access-token', sinon.match.has('maxAge'))).to.be.true;
      expect(req.user).to.deep.equal(refreshed.user);
      expect(next.calledOnce).to.be.true;
      expect((res.status as sinon.SinonStub).called).to.be.false;
    });
  });

  describe('refreshToken', () => {
    let instance: AuthManager;
    let req: Request;
    let generateAccessTokenStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      req = {
        cookies: {},
        body: {},
      } as Request;

      generateAccessTokenStub = sandbox.stub(instance, 'generateAccessToken');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return undefined if no refresh token is provided', async () => {
      const result = await instance.refreshToken(req);
      expect(result).to.be.undefined;
    });

    it('should return undefined if refresh token is invalid (from cookies)', async () => {
      req.cookies.refresh = 'invalid-token';
      generateAccessTokenStub.resolves(null);

      const result = await instance.refreshToken(req);
      expect(result).to.be.undefined;
      expect(generateAccessTokenStub.calledWith('invalid-token')).to.be.true;
    });

    it('should return token if refresh token is valid (from cookies)', async () => {
      req.cookies.refresh = 'valid-token';
      const token = { user: { uuid: 'user-uuid' }, token: 'new-access-token' };
      generateAccessTokenStub.resolves(token);

      const result = await instance.refreshToken(req);
      expect(result).to.deep.equal(token);
    });

    it('should return token if refresh token is valid (from body)', async () => {
      req.body.refreshToken = 'valid-token';
      const token = { user: { uuid: 'user-uuid' }, token: 'new-access-token' };
      generateAccessTokenStub.resolves(token);

      const result = await instance.refreshToken(req);
      expect(result).to.deep.equal(token);
    });

    it('should return undefined if refresh token is invalid (from body)', async () => {
      req.body.refreshToken = 'invalid-token';
      generateAccessTokenStub.resolves(null);

      const result = await instance.refreshToken(req);
      expect(result).to.be.undefined;
    });
  });


  describe('generateJWT', () => {
    let instance: AuthManager;
    let req: Request;
    let res: Response;
    let issueRefreshTokenStub: sinon.SinonStub;
    let issueAuthCodeStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      req = {
        user: { uuid: 'user-uuid', provider: 'local' },
        cookies: {},
        protocol: 'http',
        hostname: 'localhost',
        get: (header: string) => (header === 'host' ? 'localhost:3000' : ''),
      } as unknown as Request;
      res = {
        cookie: sandbox.stub().returnsThis(),
        redirect: sandbox.stub(),
        clearCookie: sandbox.stub(),
      } as unknown as Response;
      issueRefreshTokenStub = sandbox.stub(instance, 'issueRefreshToken')
        .resolves({ token: 'mocked-refresh-token', expires: new Date(Date.now() + 1000) });
      issueAuthCodeStub = sandbox.stub(instance, 'issueAuthCode').resolves('the-code');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('sets the three cookies and redirects on the same host', async () => {
      await instance.generateJWT()(req, res);

      const cookie = res.cookie as sinon.SinonStub;
      expect(cookie.calledThrice).to.be.true;
      expect(cookie.getCall(0).args[0]).to.equal('auth');
      expect(cookie.getCall(1).args[0]).to.equal('refresh');
      expect(cookie.getCall(1).args[1]).to.equal('mocked-refresh-token');
      expect(cookie.getCall(2).args[0]).to.equal('provider');
      const access = jwt.decode(cookie.getCall(0).args[1]) as any;
      expect(access.user.uuid).to.equal('user-uuid');
      expect(access.sub).to.equal('user-uuid');

      expect((res.redirect as sinon.SinonStub).calledOnceWithExactly('/')).to.be.true;
      expect((res.clearCookie as sinon.SinonStub).calledOnceWithExactly('redirect')).to.be.true;
      expect(issueRefreshTokenStub.calledOnceWithExactly('user-uuid', undefined)).to.be.true;
      expect(issueAuthCodeStub.called).to.be.false;
    });

    it('appends the tokens for an external host by default, and sets the cookies', async () => {
      req.cookies['redirect'] = 'http://externalhost.com/path?x=1';

      await instance.generateJWT()(req, res);

      const landing = new URL((res.redirect as sinon.SinonStub).firstCall.args[0]);
      expect(landing.origin + landing.pathname).to.equal('http://externalhost.com/path');
      expect(landing.searchParams.get('x')).to.equal('1');
      expect(landing.searchParams.get('accessToken')).to.equal((res.cookie as sinon.SinonStub).getCall(0).args[1]);
      expect(landing.searchParams.get('refreshToken')).to.equal('mocked-refresh-token');
      expect(landing.searchParams.get('provider')).to.equal('local');
      expect((res.cookie as sinon.SinonStub).calledThrice).to.be.true;
      expect(issueAuthCodeStub.called).to.be.false;
    });

    it('redirects an external host to its callback with a one-time code and sets no cookie, with externalLogin "code"', async () => {
      req.cookies['redirect'] = 'http://externalhost.com/path?x=1';
      (instance.options as IAuthOptions).externalLogin = 'code';

      try {
        await instance.generateJWT()(req, res);
      } finally {
        delete (instance.options as IAuthOptions).externalLogin;
      }

      expect((res.redirect as sinon.SinonStub).calledOnceWithExactly('http://externalhost.com/auth/callback?code=the-code')).to.be.true;
      expect((res.cookie as sinon.SinonStub).called).to.be.false;
      expect(issueRefreshTokenStub.called).to.be.false;
      expect(issueAuthCodeStub.calledOnce).to.be.true;
      expect(issueAuthCodeStub.firstCall.args[0]).to.deep.equal(req.user);
      expect(issueAuthCodeStub.firstCall.args[1].href).to.equal('http://externalhost.com/path?x=1');
      expect((res.clearCookie as sinon.SinonStub).calledOnceWithExactly('redirect')).to.be.true;
    });

    it('keeps the cookie path for an external redirectUrl given without the cookie', async () => {
      await instance.generateJWT('http://externalhost.com/path')(req, res);

      expect(issueAuthCodeStub.called).to.be.false;
      expect((res.cookie as sinon.SinonStub).calledThrice).to.be.true;
      expect((res.redirect as sinon.SinonStub).calledOnceWithExactly('http://externalhost.com/path')).to.be.true;
    });

    it('throws without a user', async () => {
      const reqWithoutUser = { ...req, user: undefined } as Request;
      const error = await instance.generateJWT()(reqWithoutUser, res).catch((e: Error) => e);
      expect(error).to.be.an('error');
      expect((error as Error).message).to.equal('No user found in request');
    });

    it('throws without a private key', async () => {
      (AuthManager as any).instance = undefined;
      const mockAuthOptions: IAuthOptions = {
        publicKey,
        masterApiKey: 'masterApiKey',
        authIssuer: 'authIssuer',
        authAudience: 'authAudience',
        strategies: {
          testStrategy: { authenticate: sinon.stub() } as any,
          anotherStrategy: { authenticate: sinon.stub() } as any,
        },
      };
      const mockInstance = AuthManager.getInstance(mockAuthOptions);
      try {
        const error = await mockInstance.generateJWT()(req, res).catch((e: Error) => e);
        expect(error).to.be.an('error');
        expect((error as Error).message).to.equal('No private key provided for JWT generation');
      } finally {
        (AuthManager as any).instance = undefined;
      }
    });

    it('redirects to the path in the redirect cookie', async () => {
      req.cookies = { redirect: '/target' };
      await instance.generateJWT()(req, res);

      expect((res.clearCookie as sinon.SinonStub).calledOnceWithExactly('redirect')).to.be.true;
      expect((res.redirect as sinon.SinonStub).calledOnceWithExactly('/target')).to.be.true;
      expect(issueAuthCodeStub.called).to.be.false;
    });
  });

  describe('cookieExtractor', () => {
    let instance: AuthManager;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
    });

    it('should return null if no cookies are present', () => {
      const req = {} as Request;
      const token = instance.cookieExtractor(req);
      expect(token).to.be.null;
    });

    it('should return the auth token if present in cookies', () => {
      const req = { cookies: { auth: 'mock-token' } } as unknown as Request;
      const token = instance.cookieExtractor(req);
      expect(token).to.equal('mock-token');
    });
  });

  describe('issueRefreshToken', () => {
    let instance: AuthManager;
    let findByPkStub: sinon.SinonStub;
    let createStub: sinon.SinonStub;
    let destroyStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      findByPkStub = sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'user-uuid' } as any);
      createStub = sandbox.stub(DbRefreshToken, 'create').resolves();
      destroyStub = sandbox.stub(DbRefreshToken, 'destroy').resolves(0);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('throws when the user is unknown', async () => {
      findByPkStub.resolves(null);
      const error = await instance.issueRefreshToken('user-uuid').catch((e: Error) => e);
      expect(error).to.be.an('error');
      expect((error as Error).message).to.equal('User not found');
      expect(createStub.called).to.be.false;
    });

    it('throws without a private key', async () => {
      (AuthManager as any).instance = undefined;
      const mockAuthOptions: IAuthOptions = {
        publicKey,
        masterApiKey: 'masterApiKey',
        strategies: {
          testStrategy: { authenticate: sinon.stub() } as any,
        },
      };
      const mockInstance = AuthManager.getInstance(mockAuthOptions);
      try {
        const error = await mockInstance.issueRefreshToken('user-uuid').catch((e: Error) => e);
        expect(error).to.be.an('error');
        expect((error as Error).message).to.equal('No private key provided for JWT generation');
      } finally {
        (AuthManager as any).instance = undefined;
      }
    });

    it('writes one row holding the SHA-256 of the token and its jti', async () => {
      const before = Date.now();
      const issued = await instance.issueRefreshToken('user-uuid');

      expect(createStub.calledOnce).to.be.true;
      const row = createStub.firstCall.args[0];
      const claims = jwt.verify(issued.token, publicKey, {
        algorithms: ['RS256'], issuer: 'authIssuer', audience: 'authAudience',
      }) as any;
      expect(row.jti).to.have.lengthOf(36);
      expect(row.jti).to.equal(claims.jti);
      expect(row.user_uuid).to.equal('user-uuid');
      expect(row.token).to.equal(sha256(issued.token));
      expect(row.expires.getTime()).to.equal(issued.expires.getTime());
      expect(row.expires.getTime() - before).to.be.within(REFRESH_TOKEN_LIFETIME - 1000, REFRESH_TOKEN_LIFETIME + 1000);
      expect(row.family_uuid).to.have.lengthOf(36);
      expect(row.family_created_at.getTime()).to.be.within(before, Date.now());
      expect(row.rotated_at).to.be.null;
      expect(claims.user_uuid).to.equal('user-uuid');
      expect(claims.sub).to.equal('user-uuid');
      expect(claims.impersonate_user_email).to.be.undefined;
      expect(claims.exp - claims.iat).to.be.within(REFRESH_TOKEN_LIFETIME / 1000 - 2, REFRESH_TOKEN_LIFETIME / 1000);
    });

    it('deletes the expired rows of every user first', async () => {
      await instance.issueRefreshToken('user-uuid');

      expect(destroyStub.calledOnce).to.be.true;
      expect(destroyStub.firstCall.args[0].where.expires[Op.lt]).to.be.an.instanceOf(Date);
      expect(destroyStub.calledBefore(createStub)).to.be.true;
    });

    it('carries the impersonated email in the claims', async () => {
      const issued = await instance.issueRefreshToken('user-uuid', 'other@example.com');
      const claims = jwt.decode(issued.token) as any;
      expect(claims.impersonate_user_email).to.equal('other@example.com');
    });
  });

  describe('refresh token verification', () => {
    let instance: AuthManager;
    let findByPkStub: sinon.SinonStub;
    let findOneStub: sinon.SinonStub;
    let findAllStub: sinon.SinonStub;
    let createStub: sinon.SinonStub;
    let destroyStub: sinon.SinonStub;
    let updateStub: sinon.SinonStub;
    let getUserPermissionsStub: sinon.SinonStub;
    const mockUser = { uuid: 'user-uuid', dataValues: { uuid: 'user-uuid', provider: 'local' } };
    const mockPermissions = { 'feature.view': 'grant' };

    /** Mints a token through the real code and hands back the row the database would hold. */
    const mint = async (impersonate?: string) => {
      const issued = await instance.issueRefreshToken('user-uuid', impersonate);
      const row = { uuid: 'row-uuid', ...createStub.lastCall.args[0] };
      createStub.resetHistory();
      destroyStub.resetHistory();
      findOneStub.resolves(row);
      return { token: issued.token, row };
    };

    const signRefresh = (claims: object, options: jwt.SignOptions) => jwt.sign(claims, privateKey, {
      algorithm: 'RS256', issuer: 'authIssuer', audience: 'authAudience', subject: 'user-uuid', ...options,
    });

    /** A token and its row as issued before the jti claim: bcrypt hash, no family. */
    const legacy = () => {
      const token = signRefresh({ user_uuid: 'user-uuid' }, { expiresIn: 3600 });
      const row = {
        uuid: 'old-row', user_uuid: 'user-uuid', jti: null, token: bcrypt.hashSync(token, 4),
        expires: new Date(Date.now() + 3600000), family_uuid: null, family_created_at: null, rotated_at: null,
      };
      findAllStub.resolves([row]);
      return { token, row };
    };

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      findByPkStub = sandbox.stub(DbUser, 'findByPk').resolves(mockUser as any);
      findOneStub = sandbox.stub(DbRefreshToken, 'findOne').resolves(null);
      findAllStub = sandbox.stub(DbRefreshToken, 'findAll').resolves([]);
      createStub = sandbox.stub(DbRefreshToken, 'create').resolves();
      destroyStub = sandbox.stub(DbRefreshToken, 'destroy').resolves(0);
      updateStub = sandbox.stub(DbRefreshToken, 'update').resolves([1]);
      getUserPermissionsStub = fakeAuthUtils.getUserPermissions as sinon.SinonStub;
      getUserPermissionsStub.resolves(mockPermissions);
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('generateAccessToken', () => {
      it('returns null for a token that is not a JWT', async () => {
        expect(await instance.generateAccessToken('garbage')).to.be.null;
        expect(findOneStub.called).to.be.false;
      });

      it('returns null for a token without a jti that no legacy row matches', async () => {
        const token = signRefresh({ user_uuid: 'user-uuid' }, { expiresIn: 60 });
        expect(await instance.generateAccessToken(token)).to.be.null;
        expect(findOneStub.called).to.be.false;
      });

      it('accepts a token issued before the jti, scanning only the live rows without one', async () => {
        const { token } = legacy();
        const result = await instance.generateAccessToken(token);
        if (!result) throw new Error('Result is null');
        const where = findAllStub.firstCall.args[0].where;
        expect(where.user_uuid).to.equal('user-uuid');
        expect(where.jti).to.be.null;
        expect(where.expires[Op.gt]).to.be.an.instanceOf(Date);
        expect(findOneStub.called).to.be.false;
      });

      it('returns null for an expired JWT', async () => {
        const token = signRefresh({ user_uuid: 'user-uuid' }, { expiresIn: -10, jwtid: 'old' });
        expect(await instance.generateAccessToken(token)).to.be.null;
        expect(findOneStub.called).to.be.false;
      });

      it('returns null for a jti the database does not hold', async () => {
        const { token } = await mint();
        findOneStub.resolves(null);
        expect(await instance.generateAccessToken(token)).to.be.null;
      });

      it('returns null when the row holds the hash of another token', async () => {
        const { token, row } = await mint();
        row.token = sha256('another token');
        expect(await instance.generateAccessToken(token)).to.be.null;
        expect(destroyStub.called).to.be.false;
      });

      it('returns null and revokes the user when the token was rotated', async () => {
        const { token, row } = await mint();
        row.rotated_at = new Date();
        expect(await instance.generateAccessToken(token)).to.be.null;
        expect(destroyStub.calledOnceWithExactly({ where: { user_uuid: 'user-uuid' } })).to.be.true;
      });

      it('returns null and drops the row past its idle expiry', async () => {
        const { token, row } = await mint();
        row.expires = new Date(Date.now() - 1000);
        expect(await instance.generateAccessToken(token)).to.be.null;
        expect(destroyStub.calledOnceWithExactly({ where: { jti: row.jti } })).to.be.true;
      });

      it('returns null when the user is gone', async () => {
        const { token } = await mint();
        findByPkStub.resolves(null);
        expect(await instance.generateAccessToken(token)).to.be.null;
      });

      it('answers a new access token with the user and the permissions', async () => {
        const { token } = await mint();
        const before = Date.now();

        const result = await instance.generateAccessToken(token);
        if (!result) throw new Error('Result is null');

        expect(result.token).to.equal(result.accessToken);
        expect(new Date(result.accessExpiresAt).getTime() - before).to.be.within(ACCESS_TOKEN_LIFETIME - 1000, ACCESS_TOKEN_LIFETIME + 1000);
        const decoded = jwt.verify(result.accessToken, publicKey, {
          algorithms: ['RS256'], issuer: 'authIssuer', audience: 'authAudience',
        }) as any;
        expect(decoded.user.uuid).to.equal('user-uuid');
        expect(decoded.sub).to.equal('user-uuid');
        expect(result.user.uuid).to.equal('user-uuid');
        expect(JSON.parse(Buffer.from(decoded.user.permissions, 'base64').toString())).to.deep.equal(mockPermissions);
        expect(createStub.called).to.be.false;
        expect(updateStub.called).to.be.false;
      });

      it('reads the impersonated permissions', async () => {
        const { token } = await mint('other@example.com');
        const result = await instance.generateAccessToken(token);
        if (!result) throw new Error('Result is null');
        expect(getUserPermissionsStub.calledWith(undefined, 'other@example.com')).to.be.true;
        expect(result.user.impersonateUser).to.equal('other@example.com');
      });

      it('omits the permissions and warns when the user has none', async () => {
        const { token } = await mint();
        getUserPermissionsStub.resolves({});
        const result = await instance.generateAccessToken(token);
        if (!result) throw new Error('Result is null');
        expect(result.user.permissions).to.be.undefined;
        expect(result.user.permissionWarning).to.equal('no permissions');
      });
    });

    describe('rotateRefreshToken', () => {
      it('refuses a token that is not a JWT with REFRESH_INVALID', async () => {
        expect(await instance.rotateRefreshToken('garbage')).to.deep.equal({ ok: false, code: 'REFRESH_INVALID' });
      });

      it('refuses an expired JWT with REFRESH_EXPIRED', async () => {
        const token = signRefresh({ user_uuid: 'user-uuid' }, { expiresIn: -10, jwtid: 'old' });
        expect(await instance.rotateRefreshToken(token)).to.deep.equal({ ok: false, code: 'REFRESH_EXPIRED' });
      });

      it('refuses a row past its idle expiry with REFRESH_EXPIRED', async () => {
        const { token, row } = await mint();
        row.expires = new Date(Date.now() - 1000);
        expect(await instance.rotateRefreshToken(token)).to.deep.equal({ ok: false, code: 'REFRESH_EXPIRED' });
        expect(createStub.called).to.be.false;
      });

      it('refuses a rotated token with REFRESH_REUSED and revokes the user', async () => {
        const { token, row } = await mint();
        row.rotated_at = new Date();
        expect(await instance.rotateRefreshToken(token)).to.deep.equal({ ok: false, code: 'REFRESH_REUSED' });
        expect(destroyStub.calledOnceWithExactly({ where: { user_uuid: 'user-uuid' } })).to.be.true;
        expect(createStub.called).to.be.false;
      });

      it('refuses with REFRESH_INVALID when the user is gone', async () => {
        const { token } = await mint();
        findByPkStub.resolves(null);
        expect(await instance.rotateRefreshToken(token)).to.deep.equal({ ok: false, code: 'REFRESH_INVALID' });
        expect(createStub.called).to.be.false;
      });

      it('answers a new token of the same family and retires the presented one', async () => {
        const { token, row } = await mint();

        const outcome = await instance.rotateRefreshToken(token);
        if (!outcome.ok) throw new Error(`refused: ${outcome.code}`);

        expect(outcome.refreshToken).to.not.equal(token);
        expect(createStub.calledOnce).to.be.true;
        const next = createStub.firstCall.args[0];
        expect(next.family_uuid).to.equal(row.family_uuid);
        expect(next.family_created_at.getTime()).to.equal(row.family_created_at.getTime());
        expect(next.jti).to.not.equal(row.jti);
        expect(next.jti).to.equal((jwt.decode(outcome.refreshToken) as any).jti);
        expect(next.token).to.equal(sha256(outcome.refreshToken));
        expect(next.rotated_at).to.be.null;
        expect(outcome.refreshExpiresAt).to.equal(next.expires.toISOString());

        expect(updateStub.calledOnce).to.be.true;
        expect(updateStub.firstCall.args[0].rotated_at).to.be.an.instanceOf(Date);
        expect(updateStub.firstCall.args[1]).to.deep.equal({ where: { jti: row.jti } });

        expect(outcome.accessToken).to.equal(outcome.token);
        expect((jwt.decode(outcome.accessToken) as any).user.uuid).to.equal('user-uuid');
        expect(outcome.user.uuid).to.equal('user-uuid');
        expect(destroyStub.called).to.be.false;
      });

      it('expires the new token with the sign-in, never later', async () => {
        const { token, row } = await mint();
        const hour = 60 * 60 * 1000;
        row.family_created_at = new Date(Date.now() - REFRESH_TOKEN_LIFETIME + hour);

        const outcome = await instance.rotateRefreshToken(token);
        if (!outcome.ok) throw new Error(`refused: ${outcome.code}`);

        const next = createStub.firstCall.args[0];
        expect(next.expires.getTime() - Date.now()).to.be.within(hour - 5000, hour);
        const claims = jwt.decode(outcome.refreshToken) as any;
        expect(claims.exp - claims.iat).to.be.within(hour / 1000 - 5, hour / 1000);
      });

      it('moves a token issued before the jti into a family ending with its old expiry', async () => {
        const { token, row } = legacy();

        const outcome = await instance.rotateRefreshToken(token);
        if (!outcome.ok) throw new Error(`refused: ${outcome.code}`);

        const next = createStub.firstCall.args[0];
        expect(next.jti).to.have.lengthOf(36);
        expect(next.family_uuid).to.have.lengthOf(36);
        expect(next.expires.getTime()).to.equal(row.expires.getTime());
        expect(next.family_created_at.getTime()).to.equal(row.expires.getTime() - REFRESH_TOKEN_LIFETIME);
        expect(destroyStub.calledOnceWithExactly({ where: { uuid: 'old-row' } })).to.be.true;
        expect(updateStub.called).to.be.false;
      });

      it('keeps the impersonation through the rotation', async () => {
        const { token } = await mint('other@example.com');
        const outcome = await instance.rotateRefreshToken(token);
        if (!outcome.ok) throw new Error(`refused: ${outcome.code}`);
        expect((jwt.decode(outcome.refreshToken) as any).impersonate_user_email).to.equal('other@example.com');
        expect(outcome.user.impersonateUser).to.equal('other@example.com');
      });
    });

    describe('revokeRefreshToken', () => {
      it('drops the row of the presented token', async () => {
        const { token, row } = await mint();
        await instance.revokeRefreshToken(token);
        expect(findOneStub.calledOnceWithExactly({ where: { jti: row.jti } })).to.be.true;
        expect(destroyStub.calledOnceWithExactly({ where: { uuid: 'row-uuid' } })).to.be.true;
      });

      it('drops the row of a token issued before the jti', async () => {
        const { token } = legacy();
        await instance.revokeRefreshToken(token);
        expect(findAllStub.firstCall.args[0].where.user_uuid).to.equal('user-uuid');
        expect(destroyStub.calledOnceWithExactly({ where: { uuid: 'old-row' } })).to.be.true;
      });

      it('drops it even when the JWT has expired', async () => {
        const token = signRefresh({ user_uuid: 'user-uuid' }, { expiresIn: -10, jwtid: 'expired-jti' });
        findOneStub.resolves({ uuid: 'expired-row', jti: 'expired-jti', token: sha256(token), user_uuid: 'user-uuid' });
        await instance.revokeRefreshToken(token);
        expect(destroyStub.calledOnceWithExactly({ where: { uuid: 'expired-row' } })).to.be.true;
      });

      it('ignores a token that is not a JWT', async () => {
        await instance.revokeRefreshToken('garbage');
        expect(findOneStub.called).to.be.false;
        expect(destroyStub.called).to.be.false;
      });

      it('ignores a jti the database does not hold', async () => {
        const { token } = await mint();
        findOneStub.resolves(null);
        await instance.revokeRefreshToken(token);
        expect(destroyStub.called).to.be.false;
      });

      it('ignores a token whose hash is another row', async () => {
        const { token, row } = await mint();
        row.token = sha256('another token');
        await instance.revokeRefreshToken(token);
        expect(destroyStub.called).to.be.false;
      });
    });
  });

  describe('auth codes', () => {
    let instance: AuthManager;
    let codeCreateStub: sinon.SinonStub;
    let codeDestroyStub: sinon.SinonStub;
    let codeFindOneStub: sinon.SinonStub;
    let findByPkStub: sinon.SinonStub;
    let refreshCreateStub: sinon.SinonStub;
    let getUserPermissionsStub: sinon.SinonStub;
    const user: IAMUser = {
      uuid: 'user-uuid', username: 'user', email: 'user@example.com', first_name: 'U', last_name: 'S', provider: 'github',
    };
    const mockUser = { uuid: 'user-uuid', dataValues: { uuid: 'user-uuid', provider: 'github' } };

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      codeCreateStub = sandbox.stub(DbAuthCode, 'create').resolves();
      codeDestroyStub = sandbox.stub(DbAuthCode, 'destroy').resolves(1);
      codeFindOneStub = sandbox.stub(DbAuthCode, 'findOne').resolves(null);
      findByPkStub = sandbox.stub(DbUser, 'findByPk').resolves(mockUser as any);
      refreshCreateStub = sandbox.stub(DbRefreshToken, 'create').resolves();
      sandbox.stub(DbRefreshToken, 'destroy').resolves(0);
      getUserPermissionsStub = fakeAuthUtils.getUserPermissions as sinon.SinonStub;
      getUserPermissionsStub.resolves({ 'feature.view': 'grant' });
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('issueAuthCode', () => {
      it('stores the hash of a random code with the user, the provider and the redirect path', async () => {
        const code = await instance.issueAuthCode(user, new URL('https://front.example.com/home?x=1#top'));

        expect(code).to.match(/^[A-Za-z0-9_-]{43}$/);
        expect(codeCreateStub.calledOnce).to.be.true;
        const row = codeCreateStub.firstCall.args[0];
        expect(row.code_hash).to.equal(sha256(code));
        expect(row.user_uuid).to.equal('user-uuid');
        expect(row.provider).to.equal('github');
        expect(row.redirect_path).to.equal('/home?x=1#top');
        expect(row.impersonate_user_email).to.be.null;
        expect(row.expires.getTime() - Date.now()).to.be.within(AUTH_CODE_LIFETIME - 1000, AUTH_CODE_LIFETIME);
      });

      it('deletes the expired codes first', async () => {
        await instance.issueAuthCode(user, new URL('https://front.example.com/home'));
        expect(codeDestroyStub.calledOnce).to.be.true;
        expect(codeDestroyStub.firstCall.args[0].where.expires[Op.lt]).to.be.an.instanceOf(Date);
        expect(codeDestroyStub.calledBefore(codeCreateStub)).to.be.true;
      });

      it('carries the impersonated email', async () => {
        await instance.issueAuthCode({ ...user, impersonateUser: 'other@example.com' }, new URL('https://front.example.com/'));
        expect(codeCreateStub.firstCall.args[0].impersonate_user_email).to.equal('other@example.com');
      });

      it('differs between two issues', async () => {
        const target = new URL('https://front.example.com/');
        expect(await instance.issueAuthCode(user, target)).to.not.equal(await instance.issueAuthCode(user, target));
      });
    });

    describe('exchangeAuthCode', () => {
      const stored = (code: string, extra: object = {}) => {
        const row = {
          code_hash: sha256(code),
          user_uuid: 'user-uuid',
          impersonate_user_email: null,
          provider: 'github',
          redirect_path: '/home',
          expires: new Date(Date.now() + 30000),
          ...extra,
        };
        codeFindOneStub.resolves(row);
        return row;
      };

      it('answers null for an empty code', async () => {
        expect(await instance.exchangeAuthCode('')).to.be.null;
        expect(codeFindOneStub.called).to.be.false;
      });

      it('answers null for an unknown code', async () => {
        expect(await instance.exchangeAuthCode('unknown')).to.be.null;
        expect(codeFindOneStub.calledOnceWithExactly({ where: { code_hash: sha256('unknown') } })).to.be.true;
        expect(codeDestroyStub.called).to.be.false;
        expect(refreshCreateStub.called).to.be.false;
      });

      it('answers null when another redeem claimed the row first', async () => {
        stored('the-code');
        codeDestroyStub.resolves(0);
        expect(await instance.exchangeAuthCode('the-code')).to.be.null;
        expect(refreshCreateStub.called).to.be.false;
      });

      it('answers null for an expired code and still deletes it', async () => {
        stored('the-code', { expires: new Date(Date.now() - 1000) });
        expect(await instance.exchangeAuthCode('the-code')).to.be.null;
        expect(codeDestroyStub.calledOnceWithExactly({ where: { code_hash: sha256('the-code') } })).to.be.true;
        expect(refreshCreateStub.called).to.be.false;
      });

      it('answers null when the user is gone', async () => {
        stored('the-code');
        findByPkStub.resolves(null);
        expect(await instance.exchangeAuthCode('the-code')).to.be.null;
        expect(refreshCreateStub.called).to.be.false;
      });

      it('claims the row before minting and answers the tokens', async () => {
        stored('the-code');
        const before = Date.now();

        const result = await instance.exchangeAuthCode('the-code');
        if (!result) throw new Error('Result is null');

        expect(codeDestroyStub.calledOnceWithExactly({ where: { code_hash: sha256('the-code') } })).to.be.true;
        expect(codeDestroyStub.calledBefore(refreshCreateStub)).to.be.true;
        expect(result.provider).to.equal('github');
        expect(result.redirectPath).to.equal('/home');

        const access = jwt.verify(result.accessToken, publicKey, {
          algorithms: ['RS256'], issuer: 'authIssuer', audience: 'authAudience',
        }) as any;
        expect(access.user.uuid).to.equal('user-uuid');
        expect(new Date(result.accessExpiresAt).getTime() - before).to.be.within(ACCESS_TOKEN_LIFETIME - 1000, ACCESS_TOKEN_LIFETIME + 1000);

        expect(refreshCreateStub.calledOnce).to.be.true;
        const row = refreshCreateStub.firstCall.args[0];
        expect(row.jti).to.equal((jwt.decode(result.refreshToken) as any).jti);
        expect(row.token).to.equal(sha256(result.refreshToken));
        expect(result.refreshExpiresAt).to.equal(row.expires.toISOString());
      });

      it('reads the impersonated permissions', async () => {
        stored('the-code', { impersonate_user_email: 'other@example.com' });
        const result = await instance.exchangeAuthCode('the-code');
        if (!result) throw new Error('Result is null');
        expect(getUserPermissionsStub.calledWith(undefined, 'other@example.com')).to.be.true;
        expect((jwt.decode(result.refreshToken) as any).impersonate_user_email).to.equal('other@example.com');
      });
    });
  });


  describe('createSafeJwtPayload', () => {
    let instance: AuthManager;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should include full user if payload is under 2KB', () => {
      const smallUser = {
        uuid: '123',
        username: 'test',
        permissions: ['read', 'write'],
      };

      const payload = (instance as any).createSafeJwtPayload(smallUser);

      expect(payload).to.have.property('user');
      expect(payload.user).to.deep.equal(smallUser);
    });

    it('should omit permissions and add warning if payload exceeds 2KB', () => {
      const largePermissions = Array.from({ length: 500 }, (_, i) => `perm${i}`);
      const largeUser = {
        uuid: '456',
        username: 'test',
        permissions: largePermissions,
      };

      const payload = (instance as any).createSafeJwtPayload(largeUser);

      expect(payload).to.have.property('user');
      expect(payload.user.permissions).to.be.undefined;
      expect(payload.user.permissionWarning).to.equal(
        'Permissions omitted due to token size limit. See /api/users/:id/permission for full list.'
      );
    });
  });
});
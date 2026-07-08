import { expect } from 'chai';
import sinon from 'sinon';
import passport from 'passport';
import { AuthManager } from '../auth/auth-manager';
import bcrypt from 'bcrypt';
import { DbUser } from '../db/db-user';
import { DbRefreshToken } from '../db/db-refresh-token';
import { IAuthOptions } from '../interfaces';
import jwt from 'jsonwebtoken';
import express, { Request, Response, Router } from "express";
import { AuthUtils } from '../auth/auth-utils';
import { AuthController } from '../api/controllers/controller-auth';
import { Strategy as JWTStrategy } from "passport-jwt";
import 'mocha';

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

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      req = {
        headers: {},
        cookies: {},
        body: {},
      } as Request;
      res = {
        sendStatus: sinon.stub(),
        cookie: sinon.stub().returnsThis(),
        json: sinon.stub(),
        headersSent: false
      } as unknown as Response;
      next = sinon.stub();

      passportAuthenticateStub = sandbox.stub(passport, 'authenticate').callsFake(
        (strategy, options, callback) => {
          return (req: Request, res: Response, next: any) => {
            if (callback) {
              if (req.cookies && req.cookies.auth && req.cookies.refresh) {
                callback(null, null);
              } else if (req.headers.authorization === `Bearer ${authOptions.masterApiKey}`) {
                return next();
              } else {
                callback(null, { user: 'mocked-user' });
              }
            }
            next();
          };
        }
      );

    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return 401 if passport authenticate returns an error', () => {
      const error = new Error('Invalid token');

      passportAuthenticateStub.callsFake((strategy, options, callback) => {
        return (req: Request, res: Response, next: any) => {
          callback(error, null);
        };
      });

      instance.authMiddleware(req, res, next);

      sinon.assert.calledOnce(res.sendStatus as sinon.SinonStub);
      sinon.assert.calledWithExactly(res.sendStatus as sinon.SinonStub, 401);
      sinon.assert.notCalled(next);
    });

    it('should call next() if master API key is provided', () => {
      req.headers.authorization = `Bearer ${authOptions.masterApiKey}`;
      instance.authMiddleware(req, res, next);
      expect(next.calledOnce).to.be.true;
    });

    it('should set req.user and call next() if token is valid', async () => {
      const mockUser = { uuid: 'test-user' };
      passportAuthenticateStub.callsFake((strategy, options, callback) => {
        return (req: Request, res: Response, next: any) => {
          if (callback) {
            callback(null, { user: { uuid: 'test-user' } });
          }
          next();
        };
      });

      instance.authMiddleware(req, res, next);
      expect(req.user).to.deep.equal(mockUser);
    });

    it('should return 401 if no authorization header is present', async () => {
      passportAuthenticateStub.callsFake((strategy, options, callback) => {
        return (req: Request, res: Response, next: any) => {
          callback(null, null);
          next();
        };
      });
      await instance.authMiddleware(req, res, next);
      expect((res.sendStatus as sinon.SinonStub).calledWith(401)).to.be.true;
    });

    it('should return 401 if token refresh fails', async () => {
      req.cookies = { auth: undefined, refresh: 'refresh-token' };
      passportAuthenticateStub.callsFake((strategy, options, callback) => {
        return (req: Request, res: Response, next: any) => {
          callback(null, null);
          next();
        };
      });
      sandbox.stub(instance, 'refreshToken').resolves(undefined);
      await instance.authMiddleware(req, res, next);
      expect((res.sendStatus as sinon.SinonStub).calledWith(401)).to.be.true;
    });

    it('should refresh token, set auth cookie and set req.user if JWT fails but refresh succeeds', async () => {
      req.cookies = { refresh: 'refresh-token' };
      const refreshedToken = { user: { uuid: 'test-user' }, token: 'new-access-token' };
      passportAuthenticateStub.callsFake((strategy, options, callback) => {
        return (req: Request, res: Response, next: any) => {
          callback(null, null);
          next();
        };
      });
      sandbox.stub(instance, 'refreshToken').resolves(refreshedToken);
      await instance.authMiddleware(req, res, next);
      expect((res.cookie as sinon.SinonStub).calledWith('auth', 'new-access-token', sinon.match.has('maxAge'))).to.be.true;
      expect(req.user).to.deep.equal(refreshedToken.user);
      expect(next.called).to.be.true;
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
    let saveRefreshTokenStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      req = {
        user: { uuid: 'user-uuid', provider: 'local' },
        cookies: {},
        protocol: 'http',
        hostname: 'localhost',
        get: (header: string) => {
          if (header === 'host') return 'localhost:3000';
          return '';
        },
      } as unknown as Request;
      res = {
        cookie: sandbox.stub().returnsThis(),
        redirect: sandbox.stub(),
        clearCookie: sandbox.stub(),
      } as unknown as Response;
      saveRefreshTokenStub = sandbox.stub(instance, 'saveRefreshToken').resolves('mocked-refresh-token');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should generate a new JWT and set cookies', async () => {
      const generateJWT = instance.generateJWT();
      await generateJWT(req, res);

      expect((res.cookie as sinon.SinonStub).calledThrice).to.be.true;
      expect((res.cookie as sinon.SinonStub).getCall(0).args[0]).to.equal('auth');
      expect((res.cookie as sinon.SinonStub).getCall(1).args[0]).to.equal('refresh');
      expect((res.cookie as sinon.SinonStub).getCall(2).args[0]).to.equal('provider');

      expect((res.redirect as sinon.SinonStub).calledOnce).to.be.true;
      expect((res.redirect as sinon.SinonStub).firstCall.args[0]).to.equal('/');

      expect((res.clearCookie as sinon.SinonStub).calledOnce).to.be.true;
      expect((res.clearCookie as sinon.SinonStub).firstCall.args[0]).to.equal('redirect');

      expect(saveRefreshTokenStub.calledOnce).to.be.true;
      expect(saveRefreshTokenStub.firstCall.args[0]).to.equal('user-uuid');
    });

    it('should append accessToken, refreshToken, and provider to the redirect URL if isExternalHost and redirect cookie is set', async () => {
      const generateJWT = instance.generateJWT();

      req.cookies['redirect'] = 'http://externalhost.com/path';

      await generateJWT(req, res);

      const redirectUrl = (res.redirect as sinon.SinonStub).firstCall.args[0];
      const parsedUrl = new URL(redirectUrl);

      expect(parsedUrl.hostname).to.equal('externalhost.com');
      expect(parsedUrl.searchParams.has('accessToken')).to.be.true;
      expect(parsedUrl.searchParams.has('refreshToken')).to.be.true;
      expect(parsedUrl.searchParams.has('provider')).to.be.true;

      expect((res.clearCookie as sinon.SinonStub).calledOnce).to.be.true;
      expect((res.clearCookie as sinon.SinonStub).firstCall.args[0]).to.equal('redirect');

      expect((res.cookie as sinon.SinonStub).calledThrice).to.be.true;
      expect((res.cookie as sinon.SinonStub).getCall(0).args[0]).to.equal('auth');
      expect((res.cookie as sinon.SinonStub).getCall(1).args[0]).to.equal('refresh');
      expect((res.cookie as sinon.SinonStub).getCall(2).args[0]).to.equal('provider');
    });


    it('should throw an error if no user is found in request', async () => {
      const reqWithoutUser = { ...req, user: undefined } as Request;
      const generateJWT = instance.generateJWT();
      try {
        await generateJWT(reqWithoutUser, res);
      } catch (error) {
        expect((error as Error).message).to.equal('No user found in request');
      }
    });

    it('should throw an error if no privateKey is found in options', async () => {
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
      const generateJWT = mockInstance.generateJWT();
      try {
        await generateJWT(req, res);
      } catch (error) {
        expect((error as Error).message).to.equal('No private key provided for JWT generation');
      } finally {
        (AuthManager as any).instance = undefined;
      }
    });

    it('should handle redirect URL correctly', async () => {
      req.cookies = { redirect: '/target' };
      const generateJWT = instance.generateJWT();
      await generateJWT(req, res);

      expect((res.clearCookie as sinon.SinonStub).calledOnce).to.be.true;
      expect((res.clearCookie as sinon.SinonStub).firstCall.args[0]).to.equal('redirect');

      expect((res.redirect as sinon.SinonStub).calledOnce).to.be.true;
      expect((res.redirect as sinon.SinonStub).firstCall.args[0]).to.equal('/target');
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

  describe('saveRefreshToken', () => {
    let instance: AuthManager;
    let findByPkStub: sinon.SinonStub;
    let createStub: sinon.SinonStub;
    let hashStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      findByPkStub = sandbox.stub(DbUser, 'findByPk');
      createStub = sandbox.stub(DbRefreshToken, 'create');
      hashStub = sandbox.stub(bcrypt, 'hash');
      sandbox.stub(jwt, 'sign').callsFake((payload) => {
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
        const body = Buffer.from(JSON.stringify(payload)).toString('base64');
        return `${header}.${body}.signature`;
      });
      sandbox.stub(jwt, 'decode').callsFake((token) => {
        const body = token.split('.')[1];
        return JSON.parse(Buffer.from(body, 'base64').toString('utf8'));
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should throw an error if user is not found', async () => {
      findByPkStub.resolves(null);
      try {
        await instance.saveRefreshToken('non-existent-uuid');
      } catch (error) {
        expect((error as Error).message).to.equal('User not found');
      }
      expect(createStub.notCalled).to.be.true;
      expect(hashStub.notCalled).to.be.true;
    });

    it('should throw an error if no privateKey is found in options', async () => {
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
        await mockInstance.saveRefreshToken('non-existent-uuid');
      } catch (error) {
        expect((error as Error).message).to.equal('No private key provided for JWT generation');
      }
      finally {
        expect(createStub.notCalled).to.be.true;
        expect(hashStub.notCalled).to.be.true;
        (AuthManager as any).instance = undefined;
      }
    });

    it('should create a refresh token and save it to the database', async () => {
      findByPkStub.resolves({ uuid: 'user-uuid' } as DbUser);
      hashStub.yields(null, 'hashed-token');
      createStub.resolves();

      const token = await instance.saveRefreshToken('user-uuid');
      const decodedToken = jwt.decode(token) as any;

      expect(decodedToken.user_uuid).to.equal('user-uuid');
      expect(hashStub.calledOnce).to.be.true;
      expect(createStub.calledOnce).to.be.true;
      expect(createStub.firstCall.args[0]).to.include({
        user_uuid: 'user-uuid',
        token: 'hashed-token',
      });
      expect(createStub.firstCall.args[0].expires).to.be.instanceOf(Date);
    });

    it('should create a refresh token to impersonate user and save it to the database', async () => {
      findByPkStub.resolves({ uuid: 'user-uuid' } as DbUser);
      hashStub.yields(null, 'hashed-token');
      createStub.resolves();

      const token = await instance.saveRefreshToken('user-uuid', 24 * 60 * 60 * 1000, 'impersonate@fake.com');
      const decodedToken = jwt.decode(token) as any;

      expect(decodedToken.user_uuid).to.equal('user-uuid');
      expect(decodedToken.impersonate_user_email).to.equal('impersonate@fake.com');
      expect(hashStub.calledOnce).to.be.true;
      expect(createStub.calledOnce).to.be.true;
      expect(createStub.firstCall.args[0]).to.include({
        user_uuid: 'user-uuid',
        token: 'hashed-token',
      });
      expect(createStub.firstCall.args[0].expires).to.be.instanceOf(Date);
    });
    it('should throw an error if bcrypt.hash fails', async () => {
      findByPkStub.resolves({ uuid: 'user-uuid' } as DbUser);
      const hashError = new Error('Hash failed');
      hashStub.yields(hashError);

      try {
        await instance.saveRefreshToken('user-uuid', 24 * 60 * 60 * 1000);
        throw new Error('Expected error was not thrown');
      } catch (err) {
        expect(err).to.equal(hashError);
        expect(createStub.notCalled).to.be.true;
      }
    });
  });

  describe('generateAccessToken', () => {
    let instance: AuthManager;
    let findByPkStub: sinon.SinonStub;
    let findAllStub: sinon.SinonStub;
    let compareSyncStub: sinon.SinonStub;
    let verifyStub: sinon.SinonStub;
    let getUserPermissionsStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);

      findByPkStub = sandbox.stub(DbUser, 'findByPk');
      findAllStub = sandbox.stub(DbRefreshToken, 'findAll');
      compareSyncStub = sandbox.stub(bcrypt, 'compareSync');
      verifyStub = sandbox.stub(jwt, 'verify');

      getUserPermissionsStub = fakeAuthUtils.getUserPermissions as sinon.SinonStub;
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return null if refresh token is invalid', async () => {
      verifyStub.throws(new jwt.JsonWebTokenError('jwt malformed'));
      try {
        const token = await instance.generateAccessToken('invalid-token');
        expect(token).to.be.null;
      } catch (error) {
        expect(error).to.be.an.instanceOf(jwt.JsonWebTokenError);
      }
    });

    it('should return null if user is not found', async () => {
      const mockToken = { user_uuid: 'user-uuid', token: 'hashed-token' };
      verifyStub.returns({ user_uuid: 'user-uuid' });
      findAllStub.resolves([mockToken]);
      compareSyncStub.returns(true);
      findByPkStub.resolves(null);

      const token = await instance.generateAccessToken('valid-token');
      expect(token).to.be.null;
    });
    it('should return null if token is not found', async () => {
      verifyStub.returns({ user_uuid: 'user-uuid' });
      findAllStub.resolves([]);

      const token = await instance.generateAccessToken('valid-token');
      expect(token).to.be.null;
    });

    it('should throw an error if no privateKey is found in options', async () => {
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
        const token = await mockInstance.generateAccessToken('invalid-token');
        expect(token).to.be.null;
      } catch (error) {
        expect((error as Error).message).to.equal('No private key provided for JWT generation');
      }
      finally {
        (AuthManager as any).instance = undefined;
      }
    });

    it('should generate a new access token if refresh token is valid without all options', async () => {
      (AuthManager as any).instance = undefined;
      const mockAuthOptions: IAuthOptions = {
        publicKey,
        privateKey,
        masterApiKey: 'masterApiKey',
        strategies: {
          testStrategy: { authenticate: sinon.stub() } as any,
          anotherStrategy: { authenticate: sinon.stub() } as any,
        },
      };
      const mockInstance = AuthManager.getInstance(mockAuthOptions);
      const mockUser = { uuid: "user-uuid", "dataValues": { uuid: 'user-uuid' } };
      const mockToken = { user_uuid: 'user-uuid', token: 'hashed-token' };
      const mockPermissions = { 'feature.view': 'grant' };

      verifyStub.returns({ user_uuid: 'user-uuid' });
      findAllStub.resolves([mockToken]);
      compareSyncStub.returns(true);
      findByPkStub.resolves(mockUser);
      getUserPermissionsStub.resolves(mockPermissions);

      const result = await mockInstance.generateAccessToken('valid-token');
      if (!result) throw new Error('Result is null');

      const decodedToken = jwt.decode(result.token) as any;
      expect(decodedToken.user.uuid).to.equal('user-uuid');
      expect(result.user.uuid).to.equal('user-uuid');

      const decodedPermissions = JSON.parse(
        Buffer.from(decodedToken.user.permissions, 'base64').toString()
      );
      expect(decodedPermissions).to.deep.equal(mockPermissions);
      (AuthManager as any).instance = undefined;
    });

    it('should generate a new access token if refresh token is valid for impersonation without permission', async () => {
      const mockUser = { uuid: "user-uuid", dataValues: { uuid: 'user-uuid' } };
      const mockToken = { user_uuid: 'user-uuid', token: 'hashed-token' };

      verifyStub.returns({ user_uuid: 'user-uuid', impersonate_user_email: 'impersonate@fake.com' });
      findAllStub.resolves([mockToken]);
      compareSyncStub.returns(true);
      findByPkStub.resolves(mockUser);

      getUserPermissionsStub.resolves({});

      const result = await instance.generateAccessToken('valid-token');
      if (!result) throw new Error('Result is null');

      const decodedToken = jwt.decode(result.token) as any;

      expect(decodedToken.user.uuid).to.equal('user-uuid');
      expect(result.user.uuid).to.equal('user-uuid');
      expect(decodedToken.user.impersonateUser).to.equal('impersonate@fake.com');
      expect(decodedToken.user.permissions).to.be.undefined;
      expect(decodedToken.user.permissionWarning).to.equal('no permissions');
    });


    it('should generate a new access token if refresh token is valid', async () => {
      const mockUser = { uuid: "user-uuid", "dataValues": { uuid: 'user-uuid' } };
      const mockToken = { user_uuid: 'user-uuid', token: 'hashed-token' };
      const mockPermissions = { 'feature.view': 'grant' };

      verifyStub.returns({ user_uuid: 'user-uuid' });
      findAllStub.resolves([mockToken]);
      compareSyncStub.returns(true);
      findByPkStub.resolves(mockUser);
      getUserPermissionsStub.resolves(mockPermissions);

      const result = await instance.generateAccessToken('valid-token');
      if (!result) throw new Error('Result is null');

      const decodedToken = jwt.decode(result.token) as any;
      expect(decodedToken.user.uuid).to.equal('user-uuid');
      expect(result.user.uuid).to.equal('user-uuid');

      const decodedPermissions = JSON.parse(
        Buffer.from(decodedToken.user.permissions, 'base64').toString()
      );
      expect(decodedPermissions).to.deep.equal(mockPermissions);
    });
  });

  describe('revokeRefreshToken', () => {
    let instance: AuthManager;
    let findAllStub: sinon.SinonStub;
    let destroyStub: sinon.SinonStub;
    let compareSyncStub: sinon.SinonStub;
    let verifyStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      findAllStub = sandbox.stub(DbRefreshToken, 'findAll');
      destroyStub = sandbox.stub(DbRefreshToken, 'destroy');
      compareSyncStub = sandbox.stub(bcrypt, 'compareSync');
      verifyStub = sandbox.stub(jwt, 'verify');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should destroy the refresh token if it is valid', async () => {
      const mockToken = { uuid: 'token-uuid', user_uuid: 'user-uuid', token: 'hashed-token' };
      verifyStub.returns({ user_uuid: 'user-uuid' });
      findAllStub.resolves([mockToken]);
      compareSyncStub.returns(true);
      destroyStub.resolves();

      await instance.revokeRefreshToken('valid-token');

      expect(destroyStub.calledOnce).to.be.true;
      expect(destroyStub.firstCall.args[0]).to.deep.equal({ where: { uuid: 'token-uuid' } });
    });

    it('should not throw an error if refresh token is invalid', async () => {
      verifyStub.throws(new jwt.JsonWebTokenError('jwt malformed'));
      try {
        await instance.revokeRefreshToken('invalid-token');
      } catch (error) {
        expect(error).to.be.an.instanceOf(jwt.JsonWebTokenError);
      }

      expect(destroyStub.notCalled).to.be.true;
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
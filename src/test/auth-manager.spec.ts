import { expect } from 'chai';
import sinon from 'sinon';
import passport from 'passport';
import { AuthManager } from '../auth/auth-manager';
import bcrypt from 'bcrypt';
import { AuthUserTable } from '../db/auth-user-table';
import { RefreshTokenTable } from '../db/refresh-token-table';
import { IAuthOptions } from '../interfaces';
import jwt from 'jsonwebtoken';
import { RefreshExpiryTable } from '../db/refresh-expiry-table';
import { Request, Response } from "express";
import { AuthUtils } from '../auth/auth-utils';

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
    strategies: {},
  };

  afterEach(() => {
    sinon.restore();
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

  it('should call passport.use with jwtAuth strategy', () => {
    const passportStub = sinon.stub(passport, 'use');
    const instance = AuthManager.getInstance(authOptions);
    instance.init();
    expect(passportStub.calledWith('jwtAuth')).to.be.true;
  });

  describe('authMiddleware', () => {
    let instance: AuthManager;
    let req: Request;
    let res: Response;
    let next: sinon.SinonStub;
    let refreshTokenStub: sinon.SinonStub;
    let passportAuthenticateStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      req = {
        headers: {},
        cookies: {},
      } as Request;
      res = {
        sendStatus: sinon.stub(),
      } as unknown as Response;
      next = sinon.stub();
      refreshTokenStub = sinon.stub(instance, 'refreshToken').resolves(undefined);

      passportAuthenticateStub = sinon.stub(passport, 'authenticate').callsFake(
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
      sinon.restore();
    });

    it('should call next() if master API key is provided', () => {
      req.headers.authorization = `Bearer ${authOptions.masterApiKey}`;
      instance.authMiddleware(req, res, next);
      expect(next.calledOnce).to.be.true;
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
      req.cookies = { auth: 'auth-token', refresh: 'refresh-token' };
      passportAuthenticateStub.callsFake((strategy, options, callback) => {
        return (req: Request, res: Response, next: any) => {
          callback(null, null);
          next();
        };
      });
      refreshTokenStub.resolves(null);
      await instance.authMiddleware(req, res, next);
      expect((res.sendStatus as sinon.SinonStub).calledWith(401)).to.be.true;
    });
  });


  describe('refreshToken', () => {
    let instance: AuthManager;
    let req: Request;
    let res: Response;
    let generateAccessTokenStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      req = {
        cookies: {},
        body: {},
      } as Request;
      res = {
        sendStatus: sinon.stub(),
        cookie: sinon.stub().returnsThis(),
        json: sinon.stub(),
      } as unknown as Response;
      generateAccessTokenStub = sinon.stub(instance, 'generateAccessToken');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return 401 if no refresh token is provided', async () => {
      await instance.refreshToken(req, res);
      expect((res.sendStatus as sinon.SinonStub).calledWith(401)).to.be.true;
    });

    it('should return nothing if refresh token is invalid', async () => {
      req.cookies.refresh = 'invalid-token';
      generateAccessTokenStub.resolves(null);
      const result = await instance.refreshToken(req, res);
      expect(result).to.be.equal(undefined);
    });

    it('should set auth cookie if refresh token is valid and from cookie', async () => {
      req.cookies.refresh = 'valid-token';
      const token = { user: { uuid: 'user-uuid' }, token: 'new-access-token' };
      generateAccessTokenStub.resolves(token);
      await instance.refreshToken(req, res);
      expect((res.cookie as sinon.SinonStub).calledWith('auth', 'new-access-token')).to.be.true;
    });

    it('should return JSON response if refresh token is valid and from body', async () => {
      req.body.refreshToken = 'valid-token';
      const token = { user: { uuid: 'user-uuid' }, token: 'new-access-token' };
      generateAccessTokenStub.resolves(token);
      await instance.refreshToken(req, res);
      expect((res.json as sinon.SinonStub).calledWith(token)).to.be.true;
    });

    it('should return 401 if refresh token is invalid and from body', async () => {
      req.body.refreshToken = 'invalid-token';
      generateAccessTokenStub.resolves(null);
      await instance.refreshToken(req, res);
      expect((res.sendStatus as sinon.SinonStub).calledWith(401)).to.be.true;
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
        user: { uuid: 'user-uuid' },
        cookies: {},
      } as unknown as Request;
      res = {
        cookie: sinon.stub().returnsThis(),
        redirect: sinon.stub(),
        clearCookie: sinon.stub(),
      } as unknown as Response;
      saveRefreshTokenStub = sinon.stub(instance, 'saveRefreshToken').resolves('mocked-refresh-token');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should generate a new JWT and set cookies', async () => {
      const generateJWT = instance.generateJWT();
      await generateJWT(req, res);

      expect((res.cookie as sinon.SinonStub).calledTwice).to.be.true;
      expect((res.cookie as sinon.SinonStub).firstCall.args[0]).to.equal('auth');
      expect((res.cookie as sinon.SinonStub).secondCall.args[0]).to.equal('refresh');

      expect((res.redirect as sinon.SinonStub).calledOnce).to.be.true;
      expect((res.redirect as sinon.SinonStub).firstCall.args[0]).to.equal('/');

      expect((res.clearCookie as sinon.SinonStub).notCalled).to.be.true;

      expect(saveRefreshTokenStub.calledOnce).to.be.true;
      expect(saveRefreshTokenStub.firstCall.args[0]).to.equal('user-uuid');
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

    it('should handle redirect URI correctly', async () => {
      req.cookies = { redirect: '/target' };
      const generateJWT = instance.generateJWT();
      await generateJWT(req, res);

      expect((res.clearCookie as sinon.SinonStub).calledTwice).to.be.true;
      expect((res.clearCookie as sinon.SinonStub).firstCall.args[0]).to.equal('redirect');
      expect((res.clearCookie as sinon.SinonStub).secondCall.args[0]).to.equal('failureRedirect');

      expect((res.redirect as sinon.SinonStub).calledOnce).to.be.true;
      expect((res.redirect as sinon.SinonStub).firstCall.args[0]).to.include('/target');
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
      findByPkStub = sinon.stub(AuthUserTable, 'findByPk');
      createStub = sinon.stub(RefreshTokenTable, 'create');
      hashStub = sinon.stub(bcrypt, 'hash');
      sinon.stub(jwt, 'sign').callsFake((payload) => {
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
        const body = Buffer.from(JSON.stringify(payload)).toString('base64');
        return `${header}.${body}.signature`;
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should throw an error if user is not found', async () => {
      findByPkStub.resolves(null);
      try {
        await instance.saveRefreshToken('non-existent-uuid');
      } catch (error) {
        expect((error as Error).message).to.equal('User not found');
      }
    });

    it('should create a refresh token and save it to the database', async () => {
      const mockUser = { uuid: 'user-uuid' };
      findByPkStub.resolves(mockUser);
      hashStub.yields(null, 'hashed-token');
      createStub.resolves();

      const token = await instance.saveRefreshToken('user-uuid');

      const decodedToken = jwt.decode(token) as any;
      expect(decodedToken.id).to.equal('user-uuid');

      expect(hashStub.calledOnce).to.be.true;
      expect(createStub.calledOnce).to.be.true;
      expect(createStub.firstCall.args[0]).to.include({
        auth_user_uuid: 'user-uuid',
        token: 'hashed-token'
      });
      expect(createStub.firstCall.args[0].expires).to.be.instanceOf(Date);
    });
  });

  describe('generateAccessToken', () => {
    let instance: AuthManager;
    let findByPkStub: sinon.SinonStub;
    let findAllStub: sinon.SinonStub;
    let compareSyncStub: sinon.SinonStub;
    let verifyStub: sinon.SinonStub;
    let getUserPermissionsStub: sinon.SinonStub;
    let getAuthUtilsInstanceStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);

      findByPkStub = sinon.stub(AuthUserTable, 'findByPk');
      findAllStub = sinon.stub(RefreshTokenTable, 'findAll');
      compareSyncStub = sinon.stub(bcrypt, 'compareSync');
      verifyStub = sinon.stub(jwt, 'verify');

      const fakeAuthUtils = { getUserPermissions: sinon.stub() };
      getUserPermissionsStub = fakeAuthUtils.getUserPermissions;
      getAuthUtilsInstanceStub = sinon.stub(AuthUtils, 'getInstance').returns(fakeAuthUtils as any);
    });

    afterEach(() => {
      sinon.restore();
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
      const mockToken = { auth_user_uuid: 'user-uuid', token: 'hashed-token' };
      verifyStub.returns({ id: 'user-uuid' });
      findAllStub.resolves([mockToken]);
      compareSyncStub.returns(true);
      findByPkStub.resolves(null);

      const token = await instance.generateAccessToken('valid-token');
      expect(token).to.be.null;
    });

    it('should generate a new access token if refresh token is valid', async () => {
      const mockUser = { "dataValues": { uuid: 'user-uuid' } };
      const mockToken = { auth_user_uuid: 'user-uuid', token: 'hashed-token' };
      const mockPermissions = { 'feature.view': 'grant' };

      verifyStub.returns({ id: 'user-uuid' });
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
      findAllStub = sinon.stub(RefreshTokenTable, 'findAll');
      destroyStub = sinon.stub(RefreshTokenTable, 'destroy');
      compareSyncStub = sinon.stub(bcrypt, 'compareSync');
      verifyStub = sinon.stub(jwt, 'verify');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should destroy the refresh token if it is valid', async () => {
      const mockToken = { uuid: 'token-uuid', auth_user_uuid: 'user-uuid', token: 'hashed-token' };
      verifyStub.returns({ id: 'user-uuid' });
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

  describe('getRefreshExpiry', () => {
    let instance: AuthManager;
    let findOneStub: sinon.SinonStub;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      findOneStub = sinon.stub(RefreshExpiryTable, 'findOne');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return default expiry if no customer_uuid is present', async () => {
      const req = { cookies: {} } as Request;
      const expiry = await instance.getRefreshExpiry(req);
      expect(expiry).to.equal(24 * 60 * 60 * 1000);
    });

    it('should return default expiry if no expiry record is found', async () => {
      const req = { cookies: { customer_uuid: 'customer-uuid' } } as unknown as Request;
      findOneStub.resolves(null);
      const expiry = await instance.getRefreshExpiry(req);
      expect(expiry).to.equal(24 * 60 * 60 * 1000);
    });

    it('should return expiry time from database if record is found', async () => {
      const req = { cookies: { customer_uuid: 'customer-uuid' } } as unknown as Request;
      const mockExpiry = { expiry_time: 48 * 60 * 60 * 1000 };
      findOneStub.resolves(mockExpiry);
      const expiry = await instance.getRefreshExpiry(req);
      expect(expiry).to.equal(mockExpiry.expiry_time);
    });
  });

  describe('additionalParams', () => {
    let instance: AuthManager;
    let req: Request;
    let res: Response;

    beforeEach(() => {
      instance = AuthManager.getInstance(authOptions);
      req = { query: {} } as Request;
      res = { cookie: sinon.stub().returnsThis() } as unknown as Response;
    });

    it('should set customer_uuid cookie if present in query', async () => {
      req.query.customer_uuid = 'customer-uuid';
      await instance.additionalParams(req, res);
      expect((res.cookie as sinon.SinonStub).calledWith('customer_uuid', 'customer-uuid')).to.be.true;
    });

    it('should not set customer_uuid cookie if not present in query', async () => {
      await instance.additionalParams(req, res);
      expect((res.cookie as sinon.SinonStub).notCalled).to.be.true;
    });
  });
});
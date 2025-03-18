import { expect } from 'chai';
import sinon from 'sinon';
import passport from 'passport';
import { AuthManager } from '../auth/auth-manager';
/* import bcrypt from 'bcrypt';
import { AuthUserTable } from '../db/auth-user-table';
import { RefreshTokenTable } from '../db/refresh-token-table'; */
import { IAuthOptions } from '../interfaces';

describe('AuthManager Singleton Tests', () => {
  const privateKey = `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDVqxVw...\n-----END PRIVATE KEY-----`;
  const publicKey = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5Z...\n-----END PUBLIC KEY-----`;

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

  it('should call next() if authorization header is valid', async () => {
    const instance = AuthManager.getInstance(authOptions);
    const req = {
      headers: { authorization: 'Bearer masterApiKey' },
    } as any;
    const res = {} as any;
    const next = sinon.stub();

    await instance.authMiddleware(req, res, next);

    expect(next.calledOnce).to.be.true;
  });

  /*   it('should call refreshToken if authorization header is invalid', async () => {
      const instance = AuthManager.getInstance(authOptions);
      const refreshTokenStub = sinon.stub(instance, 'refreshToken').resolves({ user: {}, token: 'newToken' });
  
      const req = {
        headers: { authorization: 'Bearer invalidToken' },
        cookies: { refresh: 'oldToken' },
      } as any;
      const res = {
        sendStatus: sinon.stub(),
        cookie: sinon.stub(),
      } as any;
      const next = sinon.stub();
  
      await instance.authMiddleware(req, res, next);
  
      expect(refreshTokenStub.calledOnce).to.be.true;
      expect(res.cookie.calledWith('auth', 'newToken')).to.be.true;
      expect(next.calledOnce).to.be.true;
    });
  
    it('should generate a new JWT and set cookies', async () => {
      const instance = AuthManager.getInstance(authOptions);
      const req = {
        user: { uuid: 'user-uuid' },
        cookies: {},
      } as any;
      const res = {
        cookie: sinon.stub(),
        redirect: sinon.stub(),
        clearCookie: sinon.stub(),
      } as any;
  
      const generateJWT = instance.generateJWT();
      await generateJWT(req, res);
  
      expect(res.cookie.calledTwice).to.be.true;
      expect(res.redirect.calledOnce).to.be.true;
    });
  
    it('should refresh token and return new token', async () => {
      const user = { uuid: 'user-uuid', dataValues: { uuid: 'user-uuid' } };
      const findByPkStub = sinon.stub(AuthUserTable, 'findByPk').resolves(user as AuthUserTable);
      const findAllStub = sinon.stub(RefreshTokenTable, 'findAll').resolves([{ token: 'hashedToken', auth_user_uuid: 'user-uuid' }] as any);
      const compareSyncStub = sinon.stub(bcrypt, 'compareSync').returns(true);
  
      const instance = AuthManager.getInstance(authOptions);
      const req = {
        cookies: { refresh: 'validRefreshToken' },
      } as any;
      const res = {
        cookie: sinon.stub(),
        json: sinon.stub(),
        sendStatus: sinon.stub(),
      } as any;
  
      const token = await instance.refreshToken(req, res);
      expect(token).to.exist;
      if (token) {
        expect(res.cookie.calledWith('auth', token.token)).to.be.true;
      }
  
      findByPkStub.restore();
      findAllStub.restore();
      compareSyncStub.restore();
    });
  
    it('should return null if refreshToken does not match', async () => {
      const findByPkStub = sinon.stub(AuthUserTable, 'findByPk').resolves(null);
      const instance = AuthManager.getInstance(authOptions);
      const req = {
        cookies: { refresh: 'invalidToken' },
      } as any;
      const res = {
        cookie: sinon.stub(),
        sendStatus: sinon.stub(),
      } as any;
  
      const token = await instance.refreshToken(req, res);
  
      expect(token).to.be.null;
      expect(res.sendStatus.calledWith(401)).to.be.true;
  
      findByPkStub.restore();
    }); */
});
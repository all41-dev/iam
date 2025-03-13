import { expect } from 'chai';
import sinon from 'sinon';
import { AuthManager } from '../auth-manager';
import { IAuthOptions } from '../interfaces';
import passport from 'passport';

describe('AuthManager Tests', () => {
  const authOptions: IAuthOptions = {
    publicKey: 'publicKey',
    privateKey: 'privateKey',
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
    passportStub.restore();
  });

});

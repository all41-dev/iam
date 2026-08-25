import { expect } from 'chai';
import { AuthUtils } from '../../auth/auth-utils';
import { setupAuthUtils } from './helpers';
import 'mocha';

describe('Auth Utils', () => {
  const ctx = setupAuthUtils();

  it('should throw an error if called without initializing options', () => {
    (AuthUtils as any).instance = undefined;

    expect(() => AuthUtils.getInstance()).to.throw('AuthUtils not initialized');
  });

  it('should return the options', () => {
    expect(ctx.authUtils.options).to.deep.equal(ctx.mockOptions);
  });
});

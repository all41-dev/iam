import { expect } from 'chai';
import sinon from 'sinon';
import { DbUser } from '../../db/db-user';
import { setupAuthUtils } from './helpers';
import 'mocha';

describe('Auth Utils - checkUser', () => {
  const ctx = setupAuthUtils();
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return user data if user exists and is allowed', async () => {
    const email = 'test@example.com';
    const displayName = 'Test User';
    const firstName = 'Test';
    const lastName = 'User';
    const provider = 'github';
    const profile = {
      emails: [{ value: email }],
      displayName,
      name: { givenName: firstName, familyName: lastName },
    };

    const user = {
      email,
      provider,
      dataValues: { email, provider },
      uuid: 'uuid-test',
      validated: true,
    };

    const userTableStub = sandbox.stub(DbUser, 'findOne').resolves(user as DbUser);
    const checkUserPermissionsStub = sandbox.stub(ctx.authUtils, 'getUserPermissions').resolves({
      read: {
        right: 'directGrant',
        context: [
          {
            uuid: '00000000-0000-0000-0000-000000000000',
            scope: 'global',
            status: 'granted',
            type: 'direct',
          },
        ],
      },
    });

    const result = await ctx.authUtils.checkUser(profile, provider);

    expect(userTableStub.calledOnce).to.be.true;
    expect(checkUserPermissionsStub.calledOnce).to.be.true;
    expect(result).to.deep.equal({
      user: {
        ...user.dataValues,
        permissions:
          'eyJyZWFkIjp7InJpZ2h0IjoiZGlyZWN0R3JhbnQiLCJjb250ZXh0IjpbeyJ1dWlkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiwic2NvcGUiOiJnbG9iYWwiLCJzdGF0dXMiOiJncmFudGVkIiwidHlwZSI6ImRpcmVjdCJ9XX19',
        permissionWarning: undefined,
      },
    });
  });

  it('should create a new user if user does not exist and handle missing firstName and lastName', async () => {
    const email = 'newuser@example.com';
    const displayName = 'NewUser';
    const provider = 'github';
    const profile = {
      emails: [{ value: email }],
      displayName,
      name: {
        givenName: undefined,
        familyName: undefined,
      },
    };

    const userTableFindStub = sandbox.stub(DbUser, 'findOne').resolves(null);
    const userTableCreateStub = sandbox.stub(DbUser, 'create').resolves({} as DbUser);

    const result = await ctx.authUtils.checkUser(profile, provider);

    expect(userTableFindStub.calledOnce).to.be.true;
    expect(userTableCreateStub.calledOnce).to.be.true;
    expect(
      userTableCreateStub.calledWith({
        email,
        username: displayName,
        first_name: displayName,
        last_name: '',
        provider,
      }),
    ).to.be.true;
    expect(result).to.deep.equal({ user: false, error: 'denied' });
  });

  it('should return error if provider does not match', async () => {
    const email = 'test@example.com';
    const displayName = 'Test User';
    const firstName = 'Test';
    const lastName = 'User';
    const provider = 'github';
    const profile = {
      emails: [{ value: email }],
      displayName,
      name: { givenName: firstName, familyName: lastName },
    };

    const user = {
      email,
      provider: 'microsoft',
      dataValues: { email, provider: 'microsoft' },
      uuid: 'uuid-test',
    };

    const userTableStub = sandbox.stub(DbUser, 'findOne').resolves(user as DbUser);

    const result = await ctx.authUtils.checkUser(profile, provider);
    expect(userTableStub.calledOnce).to.be.true;
    expect(result).to.deep.equal({ user: false, error: 'provider' });
  });

  it('should return error if user not validated', async () => {
    const email = 'test@example.com';
    const provider = 'github';
    const profile = {
      emails: [{ value: email }],
      displayName: 'Test User',
    };

    const user = {
      email,
      provider,
      dataValues: { email, provider },
      uuid: 'uuid-test',
      validated: false,
    };

    const userTableStub = sandbox.stub(DbUser, 'findOne').resolves(user as DbUser);

    const result = await ctx.authUtils.checkUser(profile, provider);

    expect(userTableStub.calledOnceWith({ where: { email } })).to.be.true;
    expect(result).to.deep.equal({ user: false, error: 'not validated' });
  });

  it('should return no permission if user does not have permission', async () => {
    const email = 'test@example.com';
    const provider = 'github';
    const profile = {
      emails: [{ value: email }],
      displayName: 'Test User',
    };

    const user = {
      email,
      provider,
      dataValues: { email, provider },
      uuid: 'uuid-test',
      validated: true,
    };

    const userTableStub = sandbox.stub(DbUser, 'findOne').resolves(user as DbUser);
    const checkUserPermissionsStub = sandbox.stub(ctx.authUtils, 'getUserPermissions').resolves({});

    const result = await ctx.authUtils.checkUser(profile, provider);

    expect(userTableStub.calledOnceWith({ where: { email } })).to.be.true;
    expect(checkUserPermissionsStub.calledOnceWith(user.uuid)).to.be.true;
    expect(result).to.deep.equal({
      user: {
        ...user.dataValues,
        permissions: undefined,
        permissionWarning: 'no permissions',
      },
    });
  });

  it('should throw an error if checkUserPermissions fails', async () => {
    const email = 'test@example.com';
    const displayName = 'Test User';
    const firstName = 'Test';
    const lastName = 'User';
    const provider = 'github';
    const profile = {
      emails: [{ value: email }],
      displayName,
      name: { givenName: firstName, familyName: lastName },
    };

    const user = {
      email,
      provider,
      dataValues: { email, provider },
      uuid: 'uuid-test',
    };

    const userTableStub = sandbox.stub(DbUser, 'findOne').resolves(user as DbUser);
    const checkUserPermissionsStub = sandbox.stub(ctx.authUtils, 'getUserPermissions').rejects(new Error('Permissions check failed'));

    try {
      await ctx.authUtils.checkUser(profile, provider);
    } catch (e: any) {
      expect(userTableStub.calledOnce).to.be.true;
      expect(checkUserPermissionsStub.calledOnceWith(user.uuid)).to.be.true;
      expect(e.message).to.equal('Permissions check failed');
    }
  });

  it('should throw an error if user creation throws an error', async () => {
    const email = 'newerror@example.com';
    const displayName = 'Error User';
    const provider = 'github';
    const profile = {
      emails: [{ value: email }],
      displayName,
      name: { givenName: 'Error', familyName: 'User' },
    };

    sandbox.stub(DbUser, 'findOne').resolves(null);
    const userTableCreateStub = sandbox.stub(DbUser, 'create').rejects(new Error('Creation failed'));

    try {
      await ctx.authUtils.checkUser(profile, provider);
    } catch (e: any) {
      expect(userTableCreateStub.calledOnce).to.be.true;
      expect(e.message).to.equal('Creation failed');
    }
  });
});

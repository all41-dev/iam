import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import * as CheckUserModule from '../utils/check-user';
import { AuthUserTable } from '../db/auth-user-table';
import * as CheckPermissionsModule from '../utils/check-permissions';

describe('Auth Process', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('checkUser', () => {
    it('should return user data if user exists and is allowed', async () => {
      const email = 'test@example.com';
      const displayName = 'Test User';
      const firstName = 'Test';
      const lastName = 'User';
      const provider = 'github';
      const profile = {
        emails: [{ value: email }],
        displayName,
        name: { givenName: firstName, familyName: lastName }
      };

      const user = {
        email,
        provider,
        dataValues: { email, provider },
        uuid: 'uuid-test'
      };

      const userTableStub = sandbox.stub(AuthUserTable, 'findOne').resolves(user as AuthUserTable);
      const checkUserPermissionsStub = sandbox
        .stub(CheckPermissionsModule, 'checkUserPermissions')
        .resolves({ featurePermissions: { read: true, write: true } });

      const result = await CheckUserModule.checkUser(profile, provider);

      expect(userTableStub.calledOnce).to.be.true;
      expect(checkUserPermissionsStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        user: {
          ...user.dataValues,
          permissions: { read: true, write: true }
        }
      });
    });

    it('should create a new user if user does not exist', async () => {
      const email = 'newuser@example.com';
      const displayName = 'New User';
      const provider = 'github';
      const profile = {
        emails: [{ value: email }],
        displayName,
      };

      const userTableFindStub = sandbox.stub(AuthUserTable, 'findOne').resolves(null);
      const userTableCreateStub = sandbox.stub(AuthUserTable, 'create').resolves({} as AuthUserTable);

      const result = await CheckUserModule.checkUser(profile, provider);

      expect(userTableFindStub.calledOnce).to.be.true;
      expect(userTableCreateStub.calledOnce).to.be.true;
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
        name: { givenName: firstName, familyName: lastName }
      };

      const user = {
        email,
        provider: 'facebook', // mismatched provider
        dataValues: { email, provider: 'facebook' },
        uuid: 'uuid-test'
      };

      const userTableStub = sandbox.stub(AuthUserTable, 'findOne').resolves(user as AuthUserTable);

      const result = await CheckUserModule.checkUser(profile, provider);
      expect(userTableStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({ user: false, error: 'provider' });
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
        name: { givenName: firstName, familyName: lastName }
      };

      const user = {
        email,
        provider,
        dataValues: { email, provider },
        uuid: 'uuid-test'
      };

      const userTableStub = sandbox.stub(AuthUserTable, 'findOne').resolves(user as AuthUserTable);
      const checkUserPermissionsStub = sandbox
        .stub(CheckPermissionsModule, 'checkUserPermissions')
        .rejects(new Error('Permissions check failed'));

      try {
        await CheckUserModule.checkUser(profile, provider);
      } catch (e: any) {
        expect(userTableStub.calledOnce).to.be.true;
        expect(checkUserPermissionsStub.calledOnce).to.be.true;
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
        name: { givenName: 'Error', familyName: 'User' }
      };

      sandbox.stub(AuthUserTable, 'findOne').resolves(null);
      const userTableCreateStub = sandbox.stub(AuthUserTable, 'create').rejects(new Error('Creation failed'));

      try {
        await CheckUserModule.checkUser(profile, provider);
      } catch (e: any) {
        expect(userTableCreateStub.calledOnce).to.be.true;
        expect(e.message).to.equal('Creation failed');
      }
    });
  });
});
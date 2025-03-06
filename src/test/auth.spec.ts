import { expect } from 'chai';
import sinon, { SinonSandbox, SinonStub } from 'sinon';
import { handleUserProfile } from '../utils/auth-process';
import * as CheckUserModule from '../utils/check-user';
import { UserTable } from '../db/users-table';
import * as CheckPermissionsModule from '../utils/check-permissions';


describe('Auth Process', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('handleUserProfile', () => {
    it('should handle user profile and return user data', async () => {
      const profile = {
        emails: [{ value: 'test@example.com' }],
        displayName: 'Test User',
        name: { givenName: 'Test', familyName: 'User' },
      };
      const provider = 'google';

      const checkUserStub: SinonStub = sandbox
        .stub(CheckUserModule, 'checkUser')
        .callsFake(() =>
          Promise.resolve({
            user: {
              email: 'test@example.com',
              displayName: 'Test User',
              firstName: 'Test',
              lastName: 'User',
              provider: 'google'
            },
          })
        );

      const result = await handleUserProfile(profile, provider);

      expect(checkUserStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        user: {
          email: 'test@example.com',
          displayName: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          provider: 'google'
        },
        error: undefined
      });
    });

    it('should handle user profile and return error if checkUser fails', async () => {
      const profile = {
        emails: [{ value: 'test@example.com' }],
        displayName: 'Test User',
        name: { givenName: 'Test', familyName: 'User' },
      };
      const provider = 'google';

      const checkUserStub: SinonStub = sandbox
        .stub(CheckUserModule, 'checkUser')
        .callsFake(() => Promise.reject(new Error('Failed to check user')));

      try {
        await handleUserProfile(profile, provider);
      } catch (e: any) {
        expect(checkUserStub.calledOnce).to.be.true;
        expect(e.message).to.equal('Failed to check user');
      }
    });
  });

  describe('checkUser', () => {
    it('should return user data if user exists and is allowed', async () => {
      const email = 'test@example.com';
      const displayName = 'Test User';
      const firstName = 'Test';
      const lastName = 'User';
      const provider = 'google';

      const user: Partial<UserTable> = {
        email,
        provider,
        allowed: true,
        toJSON: () => ({ email, provider })
      };

      const userTableStub = sandbox.stub(UserTable, 'findOne').resolves(user as UserTable);
      const checkUserPermissionsStub = sandbox
        .stub(CheckPermissionsModule, 'checkUserPermissions')
        .resolves({ featurePermissions: { read: true, write: true } });

      const result = await CheckUserModule.checkUser(email, displayName, firstName, lastName, provider);

      expect(userTableStub.calledOnce).to.be.true;
      expect(checkUserPermissionsStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        user: {
          email,
          provider,
          permissions: { read: true, write: true },
        },
      });
    });

    it('should create a new user if user does not exist', async () => {
      const email = 'newuser@example.com';
      const displayName = 'New User';
      const firstName = 'New';
      const lastName = 'User';
      const provider = 'google';

      const userTableFindStub = sandbox.stub(UserTable, 'findOne').callsFake(() =>
        Promise.resolve(null)
      );
      const userTableCreateStub = sandbox.stub(UserTable, 'create').callsFake(() =>
        Promise.resolve({} as UserTable)
      );

      const result = await CheckUserModule.checkUser(email, displayName, firstName, lastName, provider);

      expect(userTableFindStub.calledOnce).to.be.true;
      expect(userTableCreateStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({ user: false, error: 'denied' });
    });

    it('should return error if provider does not match', async () => {
      const email = 'test@example.com';
      const displayName = 'Test User';
      const firstName = 'Test';
      const lastName = 'User';
      const provider = 'google';

      const user = {
        email,
        provider: 'facebook',
        allowed: true
      } as UserTable;

      const userTableStub = sandbox.stub(UserTable, 'findOne').callsFake(() =>
        Promise.resolve(user)
      );

      const result = await CheckUserModule.checkUser(email, displayName, firstName, lastName, provider);

      expect(userTableStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({ user: false, error: 'provider' });
    });

    it('should return error if user is not allowed', async () => {
      const email = 'test@example.com';
      const displayName = 'Test User';
      const firstName = 'Test';
      const lastName = 'User';
      const provider = 'google';

      const user = {
        email,
        provider,
        allowed: false
      } as UserTable;

      const userTableStub = sandbox.stub(UserTable, 'findOne').callsFake(() =>
        Promise.resolve(user)
      );

      const result = await CheckUserModule.checkUser(email, displayName, firstName, lastName, provider);

      expect(userTableStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({ user: false, error: 'denied' });
    });

    it('should return error if checkUserPermissions fails', async () => {
      const email = 'test@example.com';
      const displayName = 'Test User';
      const firstName = 'Test';
      const lastName = 'User';
      const provider = 'google';

      const user: Partial<UserTable> = {
        email,
        provider,
        allowed: true,
        toJSON: () => ({ email, provider })
      };

      const userTableStub = sandbox.stub(UserTable, 'findOne').callsFake(() =>
        Promise.resolve(user as UserTable)
      );
      const checkUserPermissionsStub = sandbox
        .stub(CheckPermissionsModule, 'checkUserPermissions')
        .rejects(new Error('Permissions check failed'));

      try {
        await CheckUserModule.checkUser(email, displayName, firstName, lastName, provider);
      } catch (e: any) {
        expect(userTableStub.calledOnce).to.be.true;
        expect(checkUserPermissionsStub.calledOnce).to.be.true;
        expect(e.message).to.equal('Permissions check failed');
      }
    });

    it('should return error if user creation throws an error', async () => {
      const email = 'newerror@example.com';
      const displayName = 'Error User';
      const firstName = 'Error';
      const lastName = 'User';
      const provider = 'google';

      sandbox.stub(UserTable, 'findOne').callsFake(() =>
        Promise.resolve(null)
      );
      const userTableCreateStub = sandbox.stub(UserTable, 'create').callsFake(() =>
        Promise.reject(new Error('Creation failed'))
      );

      try {
        await CheckUserModule.checkUser(email, displayName, firstName, lastName, provider);
      } catch (e: any) {
        expect(userTableCreateStub.calledOnce).to.be.true;
        expect(e.message).to.equal('Creation failed');
      }
    });
  });
});
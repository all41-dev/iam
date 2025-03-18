import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import { AuthUserTable } from '../db/auth-user-table';
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { FeatureTable } from "../db/feature-table";
import { AuthUtils } from '../auth/auth-utils';
import { ScopeTable } from '../db/scope-table';
import { PermissionTable } from '../db/permission-table';
import { UserGroupTable } from '../db/user-group-table';


describe('Auth Process User', () => {
  let sandbox: SinonSandbox;
  let authUtils: AuthUtils

  beforeEach(() => {
    authUtils = AuthUtils.getInstance()
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
        .stub(authUtils, 'checkUserPermissions')
        .resolves({ permissions: { read: true, write: true } });

      const result = await authUtils.checkUser(profile, provider);

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

      const result = await authUtils.checkUser(profile, provider);

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
        provider: 'microsoft',
        dataValues: { email, provider: 'microsoft' },
        uuid: 'uuid-test'
      };

      const userTableStub = sandbox.stub(AuthUserTable, 'findOne').resolves(user as AuthUserTable);

      const result = await authUtils.checkUser(profile, provider);
      expect(userTableStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({ user: false, error: 'provider' });
    });

    it('should return error if permission does not exist', async () => {
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
      };

      const userTableStub = sandbox.stub(AuthUserTable, 'findOne').resolves(user as AuthUserTable);
      const checkUserPermissionsStub = sandbox
        .stub(authUtils, 'checkUserPermissions')
        .resolves({ permissions: undefined });

      const result = await authUtils.checkUser(profile, provider);

      expect(userTableStub.calledOnceWith({ where: { email } })).to.be.true;
      expect(checkUserPermissionsStub.calledOnceWith('uuid-test')).to.be.true;
      expect(result).to.deep.equal({ user: false, error: 'permission' });
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
        .stub(authUtils, 'checkUserPermissions')
        .rejects(new Error('Permissions check failed'));

      try {
        await authUtils.checkUser(profile, provider);
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
        await authUtils.checkUser(profile, provider);
      } catch (e: any) {
        expect(userTableCreateStub.calledOnce).to.be.true;
        expect(e.message).to.equal('Creation failed');
      }
    });
  });
});

describe('Auth Access Control', () => {
  const userEmail = 'user@example.com';
  const featureCode = 'someFeature';
  const elementUuid = 'someElementUuid';

  const userInstance = { uuid: 'userUuid', email: userEmail } as AuthUserTable;
  const featureInstance = { uuid: 'featureUuid', scope_uuid: 'scopeUuid' } as FeatureTable;
  const groupMemberships = [{ group_uuid: 'groupUuid' }] as UserGroupMemberTable[];
  const scopeInstance = { code: 'scopeCode' } as ScopeTable;
  const userGroups = [{ uuid: 'groupUuid', scope_element_uuid: elementUuid }] as UserGroupTable[];

  let sandbox: SinonSandbox;
  let authUtils: AuthUtils;

  beforeEach(() => {
    authUtils = AuthUtils.getInstance();
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should deny access if user does not exist', async () => {
    sandbox.stub(AuthUserTable, 'findOne').resolves(null);

    const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should deny access if feature does not exist', async () => {
    sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
    sandbox.stub(FeatureTable, 'findOne').resolves(null);

    const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should deny access if user has no group memberships', async () => {
    sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
    sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
    sandbox.stub(UserGroupMemberTable, 'findAll').resolves([]);

    const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should deny access if scope does not exist', async () => {
    sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
    sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
    sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
    sandbox.stub(ScopeTable, 'findOne').resolves(null);

    const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should deny access if direct permission is deny', async () => {
    const directPermissions = [{ is_deny: true, feature_scope_uuid: elementUuid }] as PermissionTable[];

    sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
    sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
    sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
    sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
    sandbox.stub(PermissionTable, 'findAll').resolves(directPermissions);
    sandbox.stub(UserGroupTable, 'findAll').resolves(userGroups);

    const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should grant access if direct permission is granted', async () => {
    const directPermissions = [{ is_deny: false, feature_scope_uuid: elementUuid }] as PermissionTable[];

    sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
    sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
    sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
    sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
    sandbox.stub(PermissionTable, 'findAll').resolves(directPermissions);
    sandbox.stub(UserGroupTable, 'findAll').resolves(userGroups);

    sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves(null);

    const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
    expect(result).to.equal('grant');
  });

  it('should deny access if parent permission is deny', async () => {
    sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
    sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
    sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
    sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
    sandbox.stub(PermissionTable, 'findAll').resolves([]);
    sandbox.stub(UserGroupTable, 'findAll').resolves(userGroups);

    sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves('deny');

    const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should grant access if parent permission is grant', async () => {
    sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
    sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
    sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
    sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
    sandbox.stub(PermissionTable, 'findAll').resolves([]);
    sandbox.stub(UserGroupTable, 'findAll').resolves(userGroups);

    sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves('grant');

    const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
    expect(result).to.equal('grant');
  });

  it('should deny access if no direct permissions and parent permission is null', async () => {
    sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
    sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
    sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
    sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
    sandbox.stub(PermissionTable, 'findAll').resolves([]);
    sandbox.stub(UserGroupTable, 'findAll').resolves(userGroups);

    sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves(null);

    const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });
});

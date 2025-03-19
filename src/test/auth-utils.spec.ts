import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import { AuthUserTable } from '../db/auth-user-table';
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { FeatureTable } from "../db/feature-table";
import { AuthUtils } from '../auth/auth-utils';
import { ScopeTable } from '../db/scope-table';
import { PermissionTable } from '../db/permission-table';
import { UserGroupTable } from '../db/user-group-table';
import { FeatureCompositionTable } from '../db/feature-composition-table';

describe('Auth Utils options', () => {
  it('should return the options', () => {
    const options = {};
    const authUtils = AuthUtils.getInstance(options);
    expect(authUtils.options).to.deep.equal(options);
  });
});

describe('Auth Check User', () => {
  let sandbox: SinonSandbox;
  let authUtils: AuthUtils

  beforeEach(() => {
    authUtils = AuthUtils.getInstance()
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
      .resolves({ read: true, write: true });

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

  it('should create a new user if user does not exist and handle missing firstName and lastName', async () => {
    const email = 'newuser@example.com';
    const displayName = 'NewUser';
    const provider = 'github';
    const profile = {
      emails: [{ value: email }],
      displayName,
      name: {
        givenName: undefined,
        familyName: undefined
      }
    };

    const userTableFindStub = sandbox.stub(AuthUserTable, 'findOne').resolves(null);
    const userTableCreateStub = sandbox.stub(AuthUserTable, 'create').resolves({} as AuthUserTable);

    const result = await authUtils.checkUser(profile, provider);

    expect(userTableFindStub.calledOnce).to.be.true;
    expect(userTableCreateStub.calledOnce).to.be.true;
    expect(userTableCreateStub.calledWith({
      email,
      username: displayName,
      first_name: displayName,
      last_name: '',
      provider,
    })).to.be.true;
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
      .resolves(undefined);

    const result = await authUtils.checkUser(profile, provider);

    expect(userTableStub.calledOnceWith({ where: { email } })).to.be.true;
    expect(checkUserPermissionsStub.calledOnceWith(email)).to.be.true;
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
      expect(checkUserPermissionsStub.calledOnceWith(email)).to.be.true;
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

describe('Auth Check User Permissions', () => {
  const email = 'test@gmail.com';
  const userUuid = 'userUuid';
  const userGroupMemberships = [{ dataValues: { group_uuid: 'groupUuid' } }];
  const permissions = [{ feature_uuid: 'featureUuid', is_deny: false }];
  const featureInstance = { uuid: 'featureUuid' };

  let authUserStub: sinon.SinonStub;
  let groupMembershipStub: sinon.SinonStub;
  let featureStub: sinon.SinonStub;
  const authUtils = AuthUtils.getInstance();

  afterEach(() => {
    sinon.restore();
  });

  it('should return permissions map for a user with valid permissions', async () => {
    authUserStub = sinon.stub(AuthUserTable, 'findOne').resolves({ uuid: userUuid } as AuthUserTable);
    groupMembershipStub = sinon.stub(UserGroupMemberTable, 'findAll').resolves(userGroupMemberships as UserGroupMemberTable[]);
    featureStub = sinon.stub(FeatureTable, 'findAll').resolves([
      {
        uuid: featureInstance.uuid,
        permissions: permissions,
      } as FeatureTable,
    ]);
    const checkAncestorPermissionsStub = sinon
      .stub(authUtils, 'checkAncestorPermissions')
      .resolves(false);



    const result = await authUtils.checkUserPermissions(email);

    expect(authUserStub.calledOnceWithExactly({ where: { email } })).to.be.true;
    expect(groupMembershipStub.calledOnceWithExactly({ where: { auth_user_uuid: userUuid } })).to.be.true;
    expect(featureStub.calledOnce).to.be.true;
    expect(
      checkAncestorPermissionsStub.calledOnceWithExactly(featureInstance.uuid, [
        userGroupMemberships[0].dataValues.group_uuid,
      ])
    ).to.be.true;

    expect(result).to.deep.equal({
      [featureInstance.uuid]: false,
    });
  });

  it('should return undefined if user is not found', async () => {
    authUserStub = sinon.stub(AuthUserTable, 'findOne').resolves(null);

    const result = await authUtils.checkUserPermissions(email);

    expect(authUserStub.calledOnceWithExactly({ where: { email } })).to.be.true;
    expect(result).to.be.undefined;
  });

  it('should handle empty group memberships gracefully', async () => {
    authUserStub = sinon.stub(AuthUserTable, 'findOne').resolves({ uuid: userUuid } as AuthUserTable);
    groupMembershipStub = sinon.stub(UserGroupMemberTable, 'findAll').resolves([]);

    const result = await authUtils.checkUserPermissions(email);

    expect(authUserStub.calledOnceWithExactly({ where: { email } })).to.be.true;
    expect(groupMembershipStub.calledOnceWithExactly({ where: { auth_user_uuid: userUuid } })).to.be.true;
    expect(result).to.deep.equal({});
  });
});

describe('Auth Check Ancestor Permissions', () => {
  const featureUuid = "featureUuid";
  const groupUuids = ["groupUuid"];
  const compositions = [{ parent_uuid: "parentFeatureUuid" }];

  let compositionsStub: sinon.SinonStub;
  let permissionsStub: sinon.SinonStub;
  const authUtils = AuthUtils.getInstance();

  afterEach(() => {
    sinon.restore();
  });

  it('should return false for no ancestor permissions found', async () => {
    compositionsStub = sinon.stub(FeatureCompositionTable, 'findAll').resolves([]);
    permissionsStub = sinon.stub(PermissionTable, 'findAll').resolves([]);

    const result = await authUtils.checkAncestorPermissions(featureUuid, groupUuids);

    expect(compositionsStub.calledOnceWithExactly({ where: { child_uuid: featureUuid } })).to.be.true;

    expect(result).to.equal(false);
  });

  it('should return true if an ancestor permission with deny is found', async () => {
    compositionsStub = sinon.stub(FeatureCompositionTable, 'findAll').resolves(compositions as FeatureCompositionTable[]);
    permissionsStub = sinon.stub(PermissionTable, 'findAll').resolves([
      { is_deny: true } as PermissionTable,
    ]);

    const result = await authUtils.checkAncestorPermissions(featureUuid, groupUuids);

    expect(compositionsStub.calledOnceWithExactly({ where: { child_uuid: featureUuid } })).to.be.true;
    expect(
      permissionsStub.calledOnceWithExactly({
        where: {
          feature_uuid: compositions[0].parent_uuid,
          group_uuid: groupUuids,
        },
      })
    ).to.be.true;

    expect(result).to.equal(true);
  });

  it('should return true if the recursive call returns true', async () => {
    const compositionsStub = sinon.stub(FeatureCompositionTable, 'findAll');
    compositionsStub.withArgs({ where: { child_uuid: 'childFeature' } })
      .resolves([{ parent_uuid: 'parentFeature' }] as FeatureCompositionTable[]);

    const permissionStub = sinon.stub(PermissionTable, 'findAll');
    permissionStub.withArgs({
      where: { feature_uuid: 'parentFeature', group_uuid: groupUuids }
    }).resolves([] as PermissionTable[]);

    compositionsStub.withArgs({ where: { child_uuid: 'parentFeature' } })
      .resolves([{ parent_uuid: 'grandparentFeature' }] as FeatureCompositionTable[]);

    permissionStub.withArgs({
      where: { feature_uuid: 'grandparentFeature', group_uuid: groupUuids }
    }).resolves([{ is_deny: true }] as PermissionTable[]);

    compositionsStub.withArgs({ where: { child_uuid: 'grandparentFeature' } })
      .resolves([] as FeatureCompositionTable[]);

    const result = await authUtils.checkAncestorPermissions('childFeature', groupUuids);
    expect(result).to.be.true;
  });

  it('should handle circular dependencies', async () => {
    const circularCompositions = [
      { parent_uuid: "parentFeatureUuid" },
      { parent_uuid: featureUuid },
    ];

    compositionsStub = sinon.stub(FeatureCompositionTable, 'findAll').resolves(circularCompositions as FeatureCompositionTable[]);
    permissionsStub = sinon.stub(PermissionTable, 'findAll').resolves([]);

    const result = await authUtils.checkAncestorPermissions(featureUuid, groupUuids);

    expect(compositionsStub.calledWith({ where: { child_uuid: featureUuid } })).to.be.true;

    expect(result).to.equal(false);
  });
});

describe('Auth Check Access', () => {
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

  it('should deny access if no direct permission and no parent permission on the element', async () => {
    const directPermissions = [{ is_deny: true, feature_scope_uuid: "differentElementUuid" }] as PermissionTable[];

    sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
    sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
    sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
    sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
    sandbox.stub(PermissionTable, 'findAll').resolves(directPermissions);
    sandbox.stub(UserGroupTable, 'findAll').resolves(userGroups);

    sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves(null);

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

  it("should return 'deny' if userGroups do not match hierarchyUUIDs", async () => {
    const utilsOptions = {
      scopeHierarchy: sinon.stub().resolves({ element1: "elementUuid", element2: "hierarchy-uuid-1" }),
    };

    const directPermissions = [{ is_deny: false, feature_scope_uuid: "elementUuid" }] as PermissionTable[];
    const userGroupsMismatch = [{ uuid: 'groupUuid', scope_element_uuid: "uuid-1" }] as UserGroupTable[];
    AuthUtils.resetInstance(utilsOptions)
    const authUtils = AuthUtils.getInstance();

    sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
    sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
    sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
    sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
    sandbox.stub(PermissionTable, 'findAll').resolves(directPermissions);
    sandbox.stub(UserGroupTable, 'findAll').resolves(userGroupsMismatch);

    const result = await authUtils.checkAccess("test@example.com", "featureCode", "elementUuid");

    expect(result).to.equal("deny");
  });
});

describe('AuthUtils checkParentFeaturePermissions', () => {
  let sandbox: sinon.SinonSandbox;
  let authUtils: AuthUtils;
  const featureUuid = 'childFeature';
  const groupUUIDs = ['group1'];
  const elementUuid = 'elementUuid';
  const hierarchyUUIDs = ['elementUuid', 'anotherUuid'];

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    authUtils = AuthUtils.getInstance();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return null if featureUuid is already visited', async () => {
    const visited = new Set<string>();
    visited.add(featureUuid);
    const result = await authUtils.checkParentFeaturePermissions(
      featureUuid,
      groupUUIDs,
      elementUuid,
      hierarchyUUIDs,
      visited
    );
    expect(result).to.be.null;
  });

  it('should return null if no compositions exist', async () => {
    sandbox.stub(FeatureCompositionTable, 'findAll').resolves([]);
    const result = await authUtils.checkParentFeaturePermissions(
      featureUuid,
      groupUUIDs,
      elementUuid,
      hierarchyUUIDs
    );
    expect(result).to.be.null;
  });

  it('should return null if no feature exist', async () => {
    sandbox.stub(FeatureCompositionTable, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as FeatureCompositionTable[]);
    sandbox.stub(PermissionTable, 'findAll').resolves([{ is_deny: true, feature_scope_uuid: elementUuid }] as PermissionTable[]);
    sandbox.stub(FeatureTable, 'findOne').resolves(null);
    const result = await authUtils.checkParentFeaturePermissions(
      featureUuid,
      groupUUIDs,
      elementUuid,
      hierarchyUUIDs
    );
    expect(result).to.be.null;
  });

  it('should return null if no scope exist', async () => {
    sandbox.stub(FeatureCompositionTable, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as FeatureCompositionTable[]);
    sandbox.stub(PermissionTable, 'findAll').resolves([{ is_deny: true, feature_scope_uuid: elementUuid }] as PermissionTable[]);
    sandbox.stub(FeatureTable, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as FeatureTable);
    sandbox.stub(ScopeTable, 'findOne').resolves(null);
    const result = await authUtils.checkParentFeaturePermissions(
      featureUuid,
      groupUUIDs,
      elementUuid,
      hierarchyUUIDs
    );
    expect(result).to.be.null;
  });

  it('should return "deny" when a parent permission denies access', async () => {
    sandbox.stub(FeatureCompositionTable, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as FeatureCompositionTable[]);
    sandbox.stub(PermissionTable, 'findAll').resolves([{ is_deny: true, feature_scope_uuid: elementUuid }] as PermissionTable[]);
    sandbox.stub(FeatureTable, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as FeatureTable);
    sandbox.stub(ScopeTable, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as ScopeTable);

    const result = await authUtils.checkParentFeaturePermissions(
      featureUuid,
      groupUUIDs,
      elementUuid,
      hierarchyUUIDs
    );
    expect(result).to.equal("deny");
  });

  it('should return "grant" when a parent permission grants access', async () => {
    sandbox.stub(FeatureCompositionTable, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as FeatureCompositionTable[]);
    sandbox.stub(PermissionTable, 'findAll').resolves([{ is_deny: false, feature_scope_uuid: elementUuid }] as PermissionTable[]);
    sandbox.stub(FeatureTable, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as FeatureTable);
    sandbox.stub(ScopeTable, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as ScopeTable);

    const result = await authUtils.checkParentFeaturePermissions(
      featureUuid,
      groupUUIDs,
      elementUuid,
      hierarchyUUIDs
    );
    expect(result).to.equal("grant");
  });

  it('should evaluate nested ancestor permissions and return "deny" if any ancestor denies access', async () => {
    const compositionsStub = sandbox.stub(FeatureCompositionTable, 'findAll');
    compositionsStub.withArgs({ where: { child_uuid: featureUuid } }).resolves([{ parent_uuid: 'parentFeature' }] as FeatureCompositionTable[]);
    compositionsStub.withArgs({ where: { child_uuid: 'parentFeature' } }).resolves([{ parent_uuid: 'grandparentFeature' }] as FeatureCompositionTable[]);
    compositionsStub.callsFake(() => Promise.resolve([]));

    const permissionStub = sandbox.stub(PermissionTable, 'findAll');
    permissionStub.withArgs({ where: { feature_uuid: 'parentFeature', group_uuid: groupUUIDs } })
      .resolves([{ is_deny: false, feature_scope_uuid: "otherElementUuid" }] as PermissionTable[]);
    permissionStub.withArgs({ where: { feature_uuid: 'grandparentFeature', group_uuid: groupUUIDs } })
      .resolves([{ is_deny: true, feature_scope_uuid: elementUuid }] as PermissionTable[]);

    sandbox.stub(FeatureTable, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as FeatureTable);
    sandbox.stub(ScopeTable, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as ScopeTable);

    const result = await authUtils.checkParentFeaturePermissions(
      featureUuid,
      groupUUIDs,
      elementUuid,
      hierarchyUUIDs
    );
    expect(result).to.equal("deny");
  });

  it('should return null when a no permission with correpsonding element found', async () => {
    sandbox.stub(FeatureCompositionTable, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as FeatureCompositionTable[]);
    sandbox.stub(PermissionTable, 'findAll').resolves([{ is_deny: true, feature_scope_uuid: "differentElementUuid" }] as PermissionTable[]);
    sandbox.stub(FeatureTable, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as FeatureTable);
    sandbox.stub(ScopeTable, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as ScopeTable);

    const result = await authUtils.checkParentFeaturePermissions(
      featureUuid,
      groupUUIDs,
      elementUuid,
      hierarchyUUIDs
    );
    expect(result).to.equal(null);
  });
});

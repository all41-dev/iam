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
import { FeatureManager } from '../auth/feature-manager';

describe('Auth Utils', () => {
  it('should return the options', () => {
    const options = {};
    const authUtils = AuthUtils.getInstance(options);
    expect(authUtils.options).to.deep.equal(options);
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
        uuid: 'uuid-test',
        validated: true,
      };

      const userTableStub = sandbox.stub(AuthUserTable, 'findOne').resolves(user as AuthUserTable);
      const checkUserPermissionsStub = sandbox
        .stub(authUtils, 'getUserClientPermissions')
        .resolves({
          "read": {
            "right": "directGrant",
            "context": [
              {
                "uuid": "00000000-0000-0000-0000-000000000000",
                "scope": "global",
                "status": "granted",
                "type": "direct"
              }
            ]
          },
        });

      const result = await authUtils.checkUser(profile, provider);

      expect(userTableStub.calledOnce).to.be.true;
      expect(checkUserPermissionsStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        user: {
          ...user.dataValues,
          permissions:
            "eyJyZWFkIjp7InJpZ2h0IjoiZGlyZWN0R3JhbnQiLCJjb250ZXh0IjpbeyJ1dWlkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiwic2NvcGUiOiJnbG9iYWwiLCJzdGF0dXMiOiJncmFudGVkIiwidHlwZSI6ImRpcmVjdCJ9XX19",
          permissionsWarning: undefined
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

      const userTableStub = sandbox.stub(AuthUserTable, 'findOne').resolves(user as AuthUserTable);

      const result = await authUtils.checkUser(profile, provider);

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

      const userTableStub = sandbox.stub(AuthUserTable, 'findOne').resolves(user as AuthUserTable);

      const checkUserPermissionsStub = sandbox
        .stub(authUtils, 'getUserClientPermissions')
        .resolves({});

      const result = await authUtils.checkUser(profile, provider);

      expect(userTableStub.calledOnceWith({ where: { email } })).to.be.true;
      expect(checkUserPermissionsStub.calledOnceWith(user.uuid)).to.be.true;
      expect(result).to.deep.equal({
        user: {
          ...user.dataValues,
          permissions: undefined,
          permissionsWarning: "no permissions"
        }
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
        .stub(authUtils, 'getUserClientPermissions')
        .rejects(new Error('Permissions check failed'));

      try {
        await authUtils.checkUser(profile, provider);
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
      const directPermissions = [{ is_deny: true, scope_element_uuid: elementUuid }] as PermissionTable[];

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
      const directPermissions = [{ is_deny: true, scope_element_uuid: "differentElementUuid" }] as PermissionTable[];

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

    it('should grant access if direct permission is granted and no ancestor deny', async () => {
      const directPermissions = [{ is_deny: false, scope_element_uuid: elementUuid }] as PermissionTable[];

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

    it('should grant access if no direct permission but parent permission is grant', async () => {
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
    it("should deny if userGroups do not match hierarchyUUIDs", async () => {
      const utilsOptions = {
        scopeHierarchy: sinon.stub().resolves({ element1: "elementUuid", element2: "hierarchy-uuid-1" }),
      };

      const directPermissions = [{ is_deny: false, scope_element_uuid: "elementUuid" }] as PermissionTable[];
      AuthUtils.resetInstance(utilsOptions)
      const authUtils = AuthUtils.getInstance();

      sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
      sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
      sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
      sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
      sandbox.stub(PermissionTable, 'findAll').resolves(directPermissions);
      sandbox.stub(UserGroupTable, 'findAll').resolves(userGroups);

      const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);

      expect(result).to.equal("deny");
    });
    it("should grant if direct permission on one of the element match hierarchyUUIDs and no ancestor deny", async () => {
      const utilsOptions = {
        scopeHierarchy: sinon.stub().resolves({ element1: elementUuid, element2: "hierarchy-uuid-1" }),
      };

      const directPermissions = [{ is_deny: false, scope_element_uuid: "hierarchy-uuid-1" }] as PermissionTable[];
      AuthUtils.resetInstance(utilsOptions)
      const authUtils = AuthUtils.getInstance();

      sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
      sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
      sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
      sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
      sandbox.stub(PermissionTable, 'findAll').resolves(directPermissions);
      sandbox.stub(UserGroupTable, 'findAll').resolves(userGroups);

      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves(null);

      const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);

      expect(result).to.equal("grant");
    });
    it("should deny access if has a direct deny permission on hierarchy uuid", async () => {
      const utilsOptions = {
        scopeHierarchy: sinon.stub().resolves({ element1: elementUuid, element2: "hierarchy-uuid-1", element3: "hierarchy-uuid-2" }),
      };

      const directPermissions = [
        { is_deny: false, scope_element_uuid: elementUuid },
        { is_deny: true, scope_element_uuid: "hierarchy-uuid-2" },
      ] as PermissionTable[];

      AuthUtils.resetInstance(utilsOptions);
      const authUtils = AuthUtils.getInstance();

      sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
      sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
      sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
      sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
      sandbox.stub(PermissionTable, 'findAll').resolves(directPermissions);
      sandbox.stub(UserGroupTable, 'findAll').resolves(userGroups);
      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves("deny");

      const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
      expect(result).to.equal("deny");
    });

    it("should grant access if user has no explicit allow permission and ancestor allow on hierarchy uuid", async () => {
      const utilsOptions = {
        scopeHierarchy: sinon.stub().resolves({ element1: elementUuid, element2: "hierarchy-uuid-1", }),
      };

      const directPermissions = [
        { is_deny: false, scope_element_uuid: "elementUuid" },
      ] as PermissionTable[];

      AuthUtils.resetInstance(utilsOptions);
      const authUtils = AuthUtils.getInstance();

      sandbox.stub(AuthUserTable, 'findOne').resolves(userInstance);
      sandbox.stub(FeatureTable, 'findOne').resolves(featureInstance);
      sandbox.stub(UserGroupMemberTable, 'findAll').resolves(groupMemberships);
      sandbox.stub(ScopeTable, 'findOne').resolves(scopeInstance);
      sandbox.stub(PermissionTable, 'findAll').resolves(directPermissions);
      sandbox.stub(UserGroupTable, 'findAll').resolves(userGroups);

      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves('grant');

      const result = await authUtils.checkAccess(userEmail, featureCode, elementUuid);
      expect(result).to.equal("grant");
    });
  });
  describe("checkAncestorEffectivePermissions", () => {
    let sandbox: sinon.SinonSandbox;
    let authUtils: AuthUtils;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      authUtils = AuthUtils.getInstance();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("should return no permissions if feature has no parents", async () => {
      sandbox.stub(FeatureCompositionTable, "findAll").resolves([]);

      const result = await authUtils.checkAncestorEffectivePermissions("featureUuid", ["groupUuid"]);
      expect(result).to.deep.equal({ inherited: false, permissions: [] });
    });
  });
  describe("checkEffectivePermissions", () => {
    let sandbox: sinon.SinonSandbox;
    let authUtils: AuthUtils;
    let featureManager: FeatureManager

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      authUtils = AuthUtils.getInstance();
      featureManager = FeatureManager.getInstance();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("should return an empty object if the user does not belong to any group", async () => {
      sandbox.stub(AuthUserTable, "findByPk").resolves(null);
      sandbox.stub(UserGroupMemberTable, "findAll").resolves([]);

      const result = await authUtils.checkEffectivePermissions("userUuid", "");
      expect(result).to.deep.equal({});
    });

    it("should return an empty object if the group does not exist", async () => {
      sandbox.stub(UserGroupTable, "findByPk").resolves(null);

      const result = await authUtils.checkEffectivePermissions("", "groupUuid");
      expect(result).to.deep.equal({});
    });

    it("should return permissions for a user in a group with granted permissions", async () => {
      const userGroupMembership = { group_uuid: "groupUuid" };
      sandbox.stub(AuthUserTable, "findByPk").resolves({ uuid: "userUuid" } as any);
      sandbox.stub(UserGroupMemberTable, "findAll").resolves([userGroupMembership] as UserGroupMemberTable[]);
      sandbox.stub(UserGroupTable, "findByPk").resolves({ uuid: "groupUuid" } as UserGroupTable);
      sandbox.stub(featureManager, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(FeatureTable, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as FeatureTable[]);
      sandbox.stub(PermissionTable, "findAll").resolves([{ scope_element_uuid: "elementUuid", is_deny: false }] as PermissionTable[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: false, permissions: [] });
      sandbox.stub(ScopeTable, "findByPk").resolves({ name: "scopeName" } as ScopeTable);

      const result = await authUtils.checkEffectivePermissions("userUuid", "");
      expect(result).to.deep.equal({
        featureCode: {
          right: "grant",
          context: [
            {
              uuid: "elementUuid",
              scope: "scopeName",
              status: "granted",
              type: "direct",
            },
          ],
        },
      });
    });

    it("should return permissions with deny status when direct deny is present", async () => {
      sandbox.stub(AuthUserTable, "findByPk").resolves({ uuid: "userUuid" } as AuthUserTable);
      sandbox.stub(UserGroupMemberTable, "findAll").resolves([{ group_uuid: "groupUuid" }] as UserGroupMemberTable[]);
      sandbox.stub(UserGroupTable, "findByPk").resolves({ uuid: "groupUuid" } as UserGroupTable);
      sandbox.stub(featureManager, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(FeatureTable, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as FeatureTable[]);
      sandbox.stub(PermissionTable, "findAll").resolves([{ scope_element_uuid: "elementUuid", is_deny: true }] as PermissionTable[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: false, permissions: [] });
      sandbox.stub(ScopeTable, "findByPk").resolves({ name: "scopeName" } as ScopeTable);

      const result = await authUtils.checkEffectivePermissions("userUuid", "");
      expect(result).to.deep.equal({
        featureCode: {
          right: "deny",
          context: [
            {
              uuid: "elementUuid",
              scope: "scopeName",
              status: "denied",
              type: "direct",
            },
          ],
        },
      });
    });

    it("should handle both granted and denied ancestor permissions", async () => {
      sandbox.stub(AuthUserTable, "findByPk").resolves({ uuid: "userUuid" } as AuthUserTable);
      sandbox.stub(UserGroupMemberTable, "findAll").resolves([{ group_uuid: "groupUuid" }] as UserGroupMemberTable[]);
      sandbox.stub(UserGroupTable, "findByPk").resolves({ uuid: "groupUuid" } as UserGroupTable);
      sandbox.stub(featureManager, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(FeatureTable, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as FeatureTable[]);
      sandbox.stub(PermissionTable, "findAll").resolves([] as PermissionTable[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({
        inherited: true,
        permissions: [
          { scope_element_uuid: "elementUuid", is_deny: true, feature_code: "featureCode1", scope_uuid: "scopeUuid" },
          { scope_element_uuid: "elementUuid", is_deny: false, feature_code: "featureCode2", scope_uuid: "scopeUuid" }
        ]
      });
      sandbox.stub(ScopeTable, "findByPk").resolves({ name: "scopeName" } as ScopeTable);

      const result = await authUtils.checkEffectivePermissions("userUuid", "");
      expect(result).to.deep.equal({
        featureCode: {
          right: "deny",
          context: [
            {
              feature_code: "featureCode1",
              uuid: "elementUuid",
              scope: "scopeName",
              status: "denied",
              type: "ancestor",
            },
            {
              feature_code: "featureCode2",
              uuid: "elementUuid",
              scope: "scopeName",
              status: "granted",
              type: "ancestor",
            },
          ],
        },
      });
    });

    it("should handle deny ancestor where both grant and deny are present on the same element", async () => {
      sandbox.stub(AuthUserTable, "findByPk").resolves({ uuid: "userUuid" } as any);
      sandbox.stub(UserGroupMemberTable, "findAll").resolves([{ group_uuid: "groupUuid" }] as UserGroupMemberTable[]);
      sandbox.stub(UserGroupTable, "findByPk").resolves({ uuid: "groupUuid" } as UserGroupTable);
      sandbox.stub(featureManager, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(FeatureTable, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as FeatureTable[]);
      sandbox.stub(PermissionTable, "findAll").resolves([{ scope_element_uuid: "elementUuid", is_deny: false }] as PermissionTable[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: true, permissions: [{ scope_element_uuid: "elementUuid", is_deny: true, feature_code: "featureCode1", scope_uuid: "scopeUuid" }] });
      sandbox.stub(ScopeTable, "findByPk").resolves({ name: "scopeName" } as ScopeTable);

      const result = await authUtils.checkEffectivePermissions("userUuid", "");
      expect(result).to.deep.equal({
        featureCode: {
          right: "rightConflict",
          context: [
            {
              uuid: "elementUuid",
              scope: "scopeName",
              status: "granted",
              type: "direct",
            },
            {
              feature_code: "featureCode1",
              uuid: "elementUuid",
              scope: "scopeName",
              status: "denied",
              type: "ancestor",
            },
          ],
        },
      });
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
      sandbox.stub(PermissionTable, 'findAll').resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as PermissionTable[]);
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
      sandbox.stub(PermissionTable, 'findAll').resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as PermissionTable[]);
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
      sandbox.stub(PermissionTable, 'findAll').resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as PermissionTable[]);
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
      sandbox.stub(PermissionTable, 'findAll').resolves([{ is_deny: false, scope_element_uuid: elementUuid }] as PermissionTable[]);
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
        .resolves([{ is_deny: false, scope_element_uuid: "otherElementUuid" }] as PermissionTable[]);
      permissionStub.withArgs({ where: { feature_uuid: 'grandparentFeature', group_uuid: groupUUIDs } })
        .resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as PermissionTable[]);

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
      sandbox.stub(PermissionTable, 'findAll').resolves([{ is_deny: true, scope_element_uuid: "differentElementUuid" }] as PermissionTable[]);
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
  describe('verifyGroupCollision', () => {
    let findAllStub: sinon.SinonStub;
    let findOneStub: sinon.SinonStub;
    let authUtils: AuthUtils;

    beforeEach(() => {
      findAllStub = sinon.stub();
      findOneStub = sinon.stub();
      authUtils = AuthUtils.getInstance();

      sinon.replace(UserGroupTable, 'findAll', findAllStub);
      sinon.replace(PermissionTable, 'findAll', findAllStub);
      sinon.replace(FeatureTable, 'findOne', findOneStub);
      sinon.replace(ScopeTable, 'findOne', findOneStub);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return conflicts when grant is overridden by deny', async () => {
      findAllStub.withArgs({ where: { uuid: ['group1'] } }).resolves([{ uuid: 'group1' }]);
      findAllStub.withArgs({ where: { group_uuid: ['group1'] } }).resolves([
        { feature_uuid: 'feature1', is_deny: false, scope_element_uuid: 'scope1' }
      ]);
      findOneStub.withArgs({ where: { uuid: 'feature1' } }).resolves({ scope_uuid: 'scopeA' });
      findOneStub.withArgs({ where: { uuid: 'scopeA' } }).resolves({ code: 'scope_code' });
      sinon.stub(authUtils, 'checkParentFeaturePermissions').resolves("deny");

      const result = await authUtils.verifyGroupCollision(['group1']);
      expect(result).to.be.an('array');
    });
  });
});
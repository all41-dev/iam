import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import { DbUser } from '../db/db-user';
import { DbUserGroupMember } from "../db/db-user-group-member";
import { DbFeature } from "../db/db-feature";
import { AuthUtils } from '../auth/auth-utils';
import { DbScope } from '../db/db-scope';
import { DbPermission } from '../db/db-permission';
import { DbUserGroup } from '../db/db-user-group';
import { DbFeatureComposition } from '../db/db-feature-composition';
import { FeatureUtils } from '../auth/feature-utils';
import { IUtilsOptions } from '../interfaces';
describe('Auth Utils', () => {
  let sandbox: sinon.SinonSandbox;
  let mockOptions: IUtilsOptions;
  let authUtils: AuthUtils;
  let featureUtils: FeatureUtils

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockOptions = {
      scopeElementAncestor: sandbox.stub().resolves(['someElementUuid']),
      scopeElementHierarchy: sandbox.stub().resolves([]),
    };

    authUtils = AuthUtils.getInstance(mockOptions);
    featureUtils = FeatureUtils.getInstance();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should throw an error if called without initializing options', () => {
    (AuthUtils as any).instance = undefined;

    expect(() => AuthUtils.getInstance()).to.throw("AuthUtils not initialized");
  });

  it('should return the options', () => {
    expect(authUtils.options).to.deep.equal(mockOptions);
  });
  describe('getUserPermissions', () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should throw an error if neither userUuid nor userEmail is provided', async () => {
      try {
        await authUtils.getUserPermissions(undefined, undefined);
        throw new Error('Test failed: error was not thrown');
      } catch (err: any) {
        expect(err.message).to.equal("Must provide either userUuid or userEmail");
      }
    });

    it('should return an empty object if no user found', async () => {
      sandbox.stub(DbUser, 'findOne').resolves(null);

      const result = await authUtils.getUserPermissions(undefined, 'user-email');
      expect(result).to.deep.equal({});
    });

    it('should return an empty object if no group memberships found', async () => {
      sandbox.stub(DbUserGroupMember, 'findAll').resolves([]);

      const result = await authUtils.getUserPermissions('user-uuid');
      expect(result).to.deep.equal({});
    });

    it('should return an empty object if no permissions found for group UUIDs', async () => {
      sandbox.stub(DbUserGroupMember, 'findAll').resolves([
        { group_uuid: 'group-1' }
      ] as DbUserGroupMember[]);

      sandbox.stub(DbPermission, 'findAll').resolves([]);

      const result = await authUtils.getUserPermissions('user-uuid');
      expect(result).to.deep.equal({});
    });

    it('should return compact permissions if permissions exist', async () => {
      sandbox.stub(DbUserGroupMember, 'findAll').resolves([
        { group_uuid: 'group-1' },
        { group_uuid: 'group-2' }
      ] as DbUserGroupMember[]);

      sandbox.stub(DbPermission, 'findAll').resolves([
        {
          feature_uuid: 'feature-1',
          scope_element_uuid: 'scope-1',
          is_deny: false
        },
        {
          feature_uuid: 'feature-2',
          scope_element_uuid: 'scope-2',
          is_deny: true
        }
      ] as DbPermission[]);

      sandbox.stub(featureUtils, "getHighestFeatures").resolves(["feature-1"]);
      sandbox.stub(authUtils, "getAllUniqueElement").resolves(["scope-1"]);

      const result = await authUtils.getUserPermissions('user-uuid');
      expect(result).to.deep.equal([
        { f: 'feature-1', e: 'scope-1', d: false, c: "top.uniq" },
        { f: 'feature-2', e: 'scope-2', d: true }
      ]);
    });
    it('should return compact permissions if permissions exist', async () => {
      sandbox.stub(DbUserGroupMember, 'findAll').resolves([
        { group_uuid: 'group-1' },
        { group_uuid: 'group-2' }
      ] as DbUserGroupMember[]);

      sandbox.stub(DbPermission, 'findAll').resolves([
        {
          feature_uuid: 'feature-1',
          scope_element_uuid: 'scope-1',
          is_deny: false
        },
        {
          feature_uuid: 'feature-2',
          scope_element_uuid: 'scope-2',
          is_deny: true
        }
      ] as DbPermission[]);

      sandbox.stub(featureUtils, "getHighestFeatures").resolves(["feature-1"]);
      sandbox.stub(authUtils, "getAllUniqueElement").resolves(["scope-2"]);

      const result = await authUtils.getUserPermissions('user-uuid');
      expect(result).to.deep.equal([
        { f: 'feature-1', e: 'scope-1', d: false, c: "top" },
        { f: 'feature-2', e: 'scope-2', d: true, c: "uniq" }
      ]);
    });
    it('should use email and return compact permissions if permissions exist', async () => {
      sandbox.stub(DbUser, 'findOne')
        .withArgs({ where: { email: "user-email" } })
        .resolves({ uuid: 'user-uuid' } as DbUser);

      sandbox.stub(DbUserGroupMember, 'findAll')
        .withArgs({ where: { user_uuid: 'user-uuid' } })
        .resolves([
          { group_uuid: 'group-1' },
          { group_uuid: 'group-2' }
        ] as DbUserGroupMember[]);

      sandbox.stub(DbPermission, 'findAll')
        .withArgs({ where: { group_uuid: ['group-1', 'group-2'] } })
        .resolves([
          {
            feature_uuid: 'feature-1',
            scope_element_uuid: 'scope-1',
            is_deny: false
          },
          {
            feature_uuid: 'feature-2',
            scope_element_uuid: 'scope-2',
            is_deny: true
          }
        ] as DbPermission[]);

      sandbox.stub(featureUtils, "getHighestFeatures").resolves(["feature-1"]);
      sandbox.stub(authUtils, "getAllUniqueElement").resolves(["scope-2"]);

      const result = await authUtils.getUserPermissions(undefined, 'user-email');
      expect(result).to.deep.equal([
        { f: 'feature-1', e: 'scope-1', d: false, c: "top" },
        { f: 'feature-2', e: 'scope-2', d: true, c: "uniq" }
      ]);
    });
  });
  describe('checkUser', () => {
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
        name: { givenName: firstName, familyName: lastName }
      };

      const user = {
        email,
        provider,
        dataValues: { email, provider },
        uuid: 'uuid-test',
        validated: true,
      };

      const userTableStub = sandbox.stub(DbUser, 'findOne').resolves(user as DbUser);
      const checkUserPermissionsStub = sandbox
        .stub(authUtils, 'getUserPermissions')
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
          permissionWarning: undefined
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

      const userTableFindStub = sandbox.stub(DbUser, 'findOne').resolves(null);
      const userTableCreateStub = sandbox.stub(DbUser, 'create').resolves({} as DbUser);

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

      const userTableStub = sandbox.stub(DbUser, 'findOne').resolves(user as DbUser);

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

      const userTableStub = sandbox.stub(DbUser, 'findOne').resolves(user as DbUser);

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

      const userTableStub = sandbox.stub(DbUser, 'findOne').resolves(user as DbUser);

      const checkUserPermissionsStub = sandbox
        .stub(authUtils, 'getUserPermissions')
        .resolves({});

      const result = await authUtils.checkUser(profile, provider);

      expect(userTableStub.calledOnceWith({ where: { email } })).to.be.true;
      expect(checkUserPermissionsStub.calledOnceWith(user.uuid)).to.be.true;
      expect(result).to.deep.equal({
        user: {
          ...user.dataValues,
          permissions: undefined,
          permissionWarning: "no permissions"
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

      const userTableStub = sandbox.stub(DbUser, 'findOne').resolves(user as DbUser);
      const checkUserPermissionsStub = sandbox
        .stub(authUtils, 'getUserPermissions')
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

      sandbox.stub(DbUser, 'findOne').resolves(null);
      const userTableCreateStub = sandbox.stub(DbUser, 'create').rejects(new Error('Creation failed'));

      try {
        await authUtils.checkUser(profile, provider);
      } catch (e: any) {
        expect(userTableCreateStub.calledOnce).to.be.true;
        expect(e.message).to.equal('Creation failed');
      }
    });
  });
  describe('checkAccess', () => {
    const reqUser = { uuid: "user-uuid", username: "admin", email: 'user@example.com', first_name: "", last_name: "", provider: "github" };
    const featureCode = 'someFeature';
    const elementUuid = 'someElementUuid';

    const userInstance = { uuid: 'userUuid', email: reqUser.email } as DbUser;
    const featureInstance = { uuid: 'featureUuid', scope_uuid: 'scopeUuid' } as DbFeature;
    const groupMemberships = [{ group_uuid: 'groupUuid' }] as DbUserGroupMember[];
    const scopeInstance = { code: 'scopeCode' } as DbScope;
    const userGroups = [{ uuid: 'groupUuid', scope_element_uuid: elementUuid }] as DbUserGroup[];
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should deny access if user does not exist', async () => {
      sandbox.stub(DbUser, 'findOne').resolves(null);

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal('deny');
    });

    it('should deny access if feature does not exist', async () => {
      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(null);

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal('deny');
    });

    it('should deny access if user has no group memberships', async () => {
      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves([]);

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal('deny');
    });

    it('should deny access if scope does not exist', async () => {
      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(null);

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal('deny');
    });

    it('should deny access if direct permission is deny', async () => {
      const directPermissions = [{ is_deny: true, scope_element_uuid: elementUuid }] as DbPermission[];

      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
      sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
      sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal('deny');
    });

    it('should deny access if no direct permission and no parent permission on the element', async () => {
      const directPermissions = [{ is_deny: true, scope_element_uuid: "differentElementUuid" }] as DbPermission[];

      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
      sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
      sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves(null);

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal('deny');
    });

    it('should grant access if direct permission is granted and no ancestor deny', async () => {
      const directPermissions = [{ is_deny: false, scope_element_uuid: elementUuid }] as DbPermission[];

      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
      sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
      sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves(null);

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal('grant');
    });

    it('should deny access if parent permission is deny', async () => {
      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
      sandbox.stub(DbPermission, 'findAll').resolves([]);
      sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves('deny');

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal('deny');
    });

    it('should grant access if no direct permission but parent permission is grant', async () => {
      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
      sandbox.stub(DbPermission, 'findAll').resolves([]);
      sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves('grant');

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal('grant');
    });

    it('should deny access if no direct permissions and parent permission is null', async () => {
      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
      sandbox.stub(DbPermission, 'findAll').resolves([]);
      sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves(null);

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal('deny');
    });
    it("should deny if userGroups do not match hierarchyUUIDs", async () => {
      (authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves(["elementUuid", "hierarchy-uuid-1"]);

      const directPermissions = [{ is_deny: false, scope_element_uuid: "elementUuid" }] as DbPermission[];

      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
      sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
      sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);

      expect(result).to.equal("deny");
    });
    it("should grant if direct permission on one of the element match hierarchyUUIDs and no ancestor deny", async () => {
      (authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves([elementUuid, "hierarchy-uuid-1"]);

      const directPermissions = [{ is_deny: false, scope_element_uuid: "hierarchy-uuid-1" }] as DbPermission[];

      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
      sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
      sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves(null);

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);

      expect(result).to.equal("grant");
    });
    it("should deny access if has a direct deny permission on hierarchy uuid", async () => {
      (authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves([elementUuid, "hierarchy-uuid-1", "hierarchy-uuid-2"]);

      const directPermissions = [
        { is_deny: false, scope_element_uuid: elementUuid },
        { is_deny: true, scope_element_uuid: "hierarchy-uuid-2" },
      ] as DbPermission[];


      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
      sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
      sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);
      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves("deny");

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal("deny");
    });

    it("should grant access if user has no explicit allow permission and ancestor allow on hierarchy uuid", async () => {
      (authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves([elementUuid, "hierarchy-uuid-1"]);

      const directPermissions = [
        { is_deny: false, scope_element_uuid: "elementUuid" },
      ] as DbPermission[];

      sandbox.stub(DbUser, 'findOne').resolves(userInstance);
      sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
      sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
      sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
      sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
      sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves('grant');

      const result = await authUtils.checkAccess(reqUser, featureCode, elementUuid);
      expect(result).to.equal("grant");
    });
  });
  describe("checkAncestorEffectivePermissions", () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("should return no permissions if feature has no parents", async () => {
      sandbox.stub(DbFeatureComposition, "findAll").resolves([]);

      const result = await authUtils.checkAncestorEffectivePermissions("featureUuid", ["groupUuid"]);
      expect(result).to.deep.equal({ inherited: false, permissions: [] });
    });
    it("should return permissions from direct parent feature", async () => {
      const fakeComposition = [{ child_uuid: "featureUuid", parent_uuid: "parent-feature-uuid" }] as DbFeatureComposition[];

      const fakeFeature = {
        code: "PARENT_FEATURE",
        scope_uuid: "parent-scope-uuid"
      } as DbFeature;

      const fakePermissions = [
        {
          scope_element_uuid: "scope-element-1",
          is_deny: false
        }
      ] as DbPermission[];

      sandbox.stub(DbFeatureComposition, "findAll")
        .withArgs({ where: { child_uuid: "featureUuid" } }).resolves(fakeComposition)
        .withArgs({ where: { child_uuid: "parent-feature-uuid" } }).resolves([]);
      sandbox.stub(DbPermission, "findAll")
        .withArgs({ where: { feature_uuid: "parent-feature-uuid", group_uuid: ["groupUuid"] } }).resolves(fakePermissions);
      sandbox.stub(DbFeature, "findByPk").withArgs("parent-feature-uuid").resolves(fakeFeature);

      const result = await authUtils.checkAncestorEffectivePermissions("featureUuid", ["groupUuid"]);

      expect(result).to.deep.equal({
        inherited: true,
        permissions: [
          {
            scope_element_uuid: "scope-element-1",
            scope_uuid: "parent-scope-uuid",
            feature_code: "PARENT_FEATURE",
            is_deny: false
          }
        ]
      });
    });
    it("should return inherited permissions from grandparent feature", async () => {
      const parentRelation = [{ child_uuid: "featureUuid", parent_uuid: "parent-feature-uuid" }] as DbFeatureComposition[];
      const grandparentRelation = [{ child_uuid: "parent-feature-uuid", parent_uuid: "grandparent-feature-uuid" }] as DbFeatureComposition[];

      const parentFeature = {
        uuid: "parent-feature-uuid",
        code: "PARENT_FEATURE",
        scope_uuid: "parent-scope-uuid"
      } as DbFeature;

      const grandparentFeature = {
        uuid: "grandparent-feature-uuid",
        code: "GRANDPARENT_FEATURE",
        scope_uuid: "grandparent-scope-uuid"
      } as DbFeature;

      const directPermissions = [] as DbPermission[];

      const inheritedPermissions = [
        {
          scope_element_uuid: "scope-element-2",
          is_deny: true
        }
      ] as DbPermission[];

      sandbox.stub(DbFeatureComposition, "findAll")
        .withArgs({ where: { child_uuid: "featureUuid" } }).resolves(parentRelation)
        .withArgs({ where: { child_uuid: "parent-feature-uuid" } }).resolves(grandparentRelation)
        .withArgs({ where: { child_uuid: "grandparent-feature-uuid" } }).resolves([]);

      sandbox.stub(DbPermission, "findAll")
        .withArgs({ where: { feature_uuid: "featureUuid", group_uuid: ["groupUuid"] } }).resolves(directPermissions)
        .withArgs({ where: { feature_uuid: "parent-feature-uuid", group_uuid: ["groupUuid"] } }).resolves([])
        .withArgs({ where: { feature_uuid: "grandparent-feature-uuid", group_uuid: ["groupUuid"] } }).resolves(inheritedPermissions);

      sandbox.stub(DbFeature, "findByPk")
        .withArgs("parent-feature-uuid").resolves(parentFeature)
        .withArgs("grandparent-feature-uuid").resolves(grandparentFeature);

      const result = await authUtils.checkAncestorEffectivePermissions("featureUuid", ["groupUuid"]);

      expect(result).to.deep.equal({
        inherited: true,
        permissions: [
          {
            scope_element_uuid: "scope-element-2",
            scope_uuid: "grandparent-scope-uuid",
            feature_code: "GRANDPARENT_FEATURE",
            is_deny: true
          }
        ]
      });
    });

  });
  describe("checkEffectivePermissions", () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("should return an empty object if the user does not exist", async () => {
      sandbox.stub(DbUser, "findByPk").resolves(null);

      const result = await authUtils.checkEffectivePermissions("userUuid");
      expect(result).to.deep.equal({});
    });
    it("should return an empty object if the user does not belong to any group", async () => {
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as DbUser);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([]);

      const result = await authUtils.checkEffectivePermissions("userUuid");
      expect(result).to.deep.equal({});
    });
    it("should return an empty object if the group does not exist", async () => {
      sandbox.stub(DbUserGroup, "findByPk").resolves(null);

      const result = await authUtils.checkEffectivePermissions("", "groupUuid");
      expect(result).to.deep.equal({});
    });
    it("should return an empty object if both user and group are provided", async () => {
      const result = await authUtils.checkEffectivePermissions("userUuid", "groupUuid");
      expect(result).to.deep.equal({});
    });
    it("should return permissions for a user with granted permissions", async () => {
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as DbUser);
      sandbox.stub(DbUserGroupMember, "findAll")
        .resolves([{ group_uuid: "groupUuid", user_uuid: "userUuid" }] as DbUserGroupMember[]);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([{ scope_element_uuid: "elementUuid", is_deny: false }] as DbPermission[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: false, permissions: [] });
      sandbox.stub(DbScope, "findByPk").resolves({ name: "scopeName" } as DbScope);

      const result = await authUtils.checkEffectivePermissions("userUuid");
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
    it("should return permissions for a group with granted permissions", async () => {
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([{ scope_element_uuid: "elementUuid", is_deny: false }] as DbPermission[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: false, permissions: [] });
      sandbox.stub(DbScope, "findByPk").resolves({ name: "scopeName" } as DbScope);

      const result = await authUtils.checkEffectivePermissions("", "groupUuid");
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
    it("should return permissions for a group with granted permissions without scopeName if Scope not found", async () => {
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([{ scope_element_uuid: "elementUuid", is_deny: false }] as DbPermission[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: false, permissions: [] });
      sandbox.stub(DbScope, "findByPk").resolves(null);

      const result = await authUtils.checkEffectivePermissions("", "groupUuid");
      expect(result).to.deep.equal({
        featureCode: {
          right: "grant",
          context: [
            {
              uuid: "elementUuid",
              scope: "",
              status: "granted",
              type: "direct",
            },
          ],
        },
      });
    });
    it("should return permissions for a user in a group with granted permissions", async () => {
      const userGroupMembership = { group_uuid: "groupUuid" };
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as any);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([userGroupMembership] as DbUserGroupMember[]);
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([{ scope_element_uuid: "elementUuid", is_deny: false }] as DbPermission[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: false, permissions: [] });
      sandbox.stub(DbScope, "findByPk").resolves({ name: "scopeName" } as DbScope);

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
    it("should return permissions for a user in a group with granted permissions in ancestor", async () => {
      const userGroupMembership = { group_uuid: "groupUuid" };
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as any);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([userGroupMembership] as DbUserGroupMember[]);
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: true, permissions: [{ scope_element_uuid: "elementUuid", is_deny: false, feature_code: "featureCode1", scope_uuid: "scopeUuid" }] });
      sandbox.stub(DbScope, "findByPk").resolves({ name: "scopeName" } as DbScope);

      const result = await authUtils.checkEffectivePermissions("userUuid", "");
      expect(result).to.deep.equal({
        featureCode: {
          right: "grant",
          context: [
            {
              feature_code: "featureCode1",
              uuid: "elementUuid",
              scope: "scopeName",
              status: "granted",
              type: "ancestor",
            },
          ],
        },
      });
    });
    it("should return permissions for a user in a group with denied permissions in ancestor", async () => {
      const userGroupMembership = { group_uuid: "groupUuid" };
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as any);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([userGroupMembership] as DbUserGroupMember[]);
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: true, permissions: [{ scope_element_uuid: "elementUuid", is_deny: true, feature_code: "featureCode1", scope_uuid: "scopeUuid" }] });
      sandbox.stub(DbScope, "findByPk").resolves({ name: "scopeName" } as DbScope);

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
          ],
        },
      });
    });
    it("should return permissions with deny status when direct deny is present", async () => {
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as DbUser);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([{ group_uuid: "groupUuid" }] as DbUserGroupMember[]);
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([{ scope_element_uuid: "elementUuid", is_deny: true }] as DbPermission[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: false, permissions: [] });
      sandbox.stub(DbScope, "findByPk").resolves({ name: "scopeName" } as DbScope);

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
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as DbUser);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([{ group_uuid: "groupUuid" }] as DbUserGroupMember[]);
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([] as DbPermission[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({
        inherited: true,
        permissions: [
          { scope_element_uuid: "elementUuid", is_deny: true, feature_code: "featureCode1", scope_uuid: "scopeUuid" },
          { scope_element_uuid: "elementUuid", is_deny: false, feature_code: "featureCode2", scope_uuid: "scopeUuid" }
        ]
      });

      sandbox.stub(DbScope, "findByPk").withArgs("scopeUuid").resolves({ uuid: "scopeUuid", name: "scopeName", code: 'scopeCode' } as DbScope);

      (authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs("elementUuid", "scopeCode").resolves(['elementUuid']);

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
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as any);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([{ group_uuid: "groupUuid" }] as DbUserGroupMember[]);
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([{ scope_element_uuid: "elementUuid", is_deny: false }] as DbPermission[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: true, permissions: [{ scope_element_uuid: "elementUuid", is_deny: true, feature_code: "featureCode1", scope_uuid: "scopeUuid" }] });
      sandbox.stub(DbScope, "findByPk").withArgs("scopeUuid").resolves({ uuid: "scopeUuid", name: "scopeName", code: 'scopeCode' } as DbScope);

      (authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs("elementUuid", "scopeCode").resolves(['elementUuid']);
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
    it("should handle deny ancestor where both grant and deny are present on the same element", async () => {
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as any);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([{ group_uuid: "groupUuid" }] as DbUserGroupMember[]);
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([
        { scope_element_uuid: "elementUuid", is_deny: false },
        { scope_element_uuid: "elementUuid", is_deny: true }] as DbPermission[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: false, permissions: [] });
      sandbox.stub(DbScope, "findByPk").withArgs("scopeUuid").resolves({ uuid: "scopeUuid", name: "scopeName", code: 'scopeCode' } as DbScope);

      (authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs("elementUuid", "scopeCode").resolves(['elementUuid']);
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
              uuid: "elementUuid",
              scope: "scopeName",
              status: "denied",
              type: "direct",
            },
          ],
        },
      });
    });
    it("should handle partialDeny where both grant and deny on element of the same hierarchy", async () => {
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as any);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([{ group_uuid: "groupUuid" }] as DbUserGroupMember[]);
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([{ scope_element_uuid: "elementUuid", is_deny: true }] as DbPermission[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: true, permissions: [{ scope_element_uuid: "ancestorElementUuid", is_deny: false, feature_code: "featureCode1", scope_uuid: "scopeAncestorUuid" }] });
      sandbox.stub(DbScope, "findByPk").withArgs("scopeUuid")
        .withArgs("scopeUuid").resolves({ uuid: "scopeUuid", name: "scopeName", code: 'scopeCode' } as DbScope)
        .withArgs("scopeAncestorUuid").resolves(null);

      (authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs("elementUuid", "scopeCode").resolves(['ancestorElementUuid', 'elementUuid']);
      const result = await authUtils.checkEffectivePermissions("userUuid", "");
      expect(result).to.deep.equal({
        featureCode: {
          right: "partialDeny",
          context: [
            {
              uuid: "elementUuid",
              scope: "scopeName",
              status: "denied",
              type: "direct",
            },
            {
              feature_code: "featureCode1",
              uuid: "ancestorElementUuid",
              scope: "",
              status: "granted",
              type: "ancestor",
            },
          ],
        },
      });
    });
    it("should handle partialGrant ancestor where both grant and deny are present on the different element", async () => {
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as any);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([{ group_uuid: "groupUuid" }] as DbUserGroupMember[]);
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions")
        .resolves({
          inherited: true, permissions: [
            { scope_element_uuid: "ancestorElementUuid1", is_deny: false, feature_code: "featureCode1", scope_uuid: "scopeAncestorUuid" },
            { scope_element_uuid: "ancestorElementUuid2", is_deny: true, feature_code: "featureCode1", scope_uuid: "scopeAncestorUuid" }
          ]
        });
      sandbox.stub(DbScope, "findByPk").withArgs("scopeUuid")
        .withArgs("scopeAncestorUuid").resolves({ uuid: "scopeUuid", name: "scopeName", code: 'scopeCode' } as DbScope)
        .withArgs("scopeAncestorUuid").resolves({ uuid: "scopeUuid", name: "scopeName", code: 'scopeCode' } as DbScope);

      (authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs("elementUuid", "scopeCode").resolves(['ancestorElementUuid2', 'ancestorElementUuid1', 'elementUuid']);
      const result = await authUtils.checkEffectivePermissions("userUuid", "");
      expect(result).to.deep.equal({
        featureCode: {
          right: "partialGrant",
          context: [
            {
              feature_code: "featureCode1",
              uuid: "ancestorElementUuid1",
              scope: "scopeName",
              status: "granted",
              type: "ancestor",
            },
            {
              feature_code: "featureCode1",
              uuid: "ancestorElementUuid2",
              scope: "scopeName",
              status: "denied",
              type: "ancestor",
            },
          ],
        },
      });
    });
    it("should return 'noRight' when no permissions exist and no ancestor conflicts are present", async () => {
      sandbox.stub(DbUser, "findByPk").resolves({ uuid: "userUuid" } as any);
      sandbox.stub(DbUserGroupMember, "findAll").resolves([{ group_uuid: "groupUuid" }] as DbUserGroupMember[]);
      sandbox.stub(DbUserGroup, "findByPk").resolves({ uuid: "groupUuid" } as DbUserGroup);
      sandbox.stub(featureUtils, "getGroupsScopeList").resolves(["scopeUuid"]);
      sandbox.stub(DbFeature, "findAll").resolves([{ uuid: "featureUuid", code: "featureCode", scope_uuid: "scopeUuid" }] as DbFeature[]);
      sandbox.stub(DbPermission, "findAll").resolves([] as DbPermission[]);
      sandbox.stub(authUtils, "checkAncestorEffectivePermissions").resolves({ inherited: true, permissions: [] });
      sandbox.stub(DbScope, "findByPk").resolves({ name: "scopeName" } as DbScope);

      const result = await authUtils.checkEffectivePermissions("", "groupUuid");

      expect(result).to.deep.equal({
        featureCode: {
          right: "noRight",
          context: [],
        },
      });
    });
  });
  describe('checkParentFeaturePermissions', () => {
    const featureUuid = 'childFeature';
    const groupUUIDs = ['group1'];
    const elementUuid = 'elementUuid';
    const hierarchyUUIDs = ['elementUuid', 'anotherUuid'];

    beforeEach(() => {
      sandbox = sinon.createSandbox();
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
      sandbox.stub(DbFeatureComposition, 'findAll').resolves([]);
      const result = await authUtils.checkParentFeaturePermissions(
        featureUuid,
        groupUUIDs,
        elementUuid,
        hierarchyUUIDs
      );
      expect(result).to.be.null;
    });

    it('should return null if no feature exist', async () => {
      sandbox.stub(DbFeatureComposition, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
      sandbox.stub(DbPermission, 'findAll').resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as DbPermission[]);
      sandbox.stub(DbFeature, 'findOne').resolves(null);
      const result = await authUtils.checkParentFeaturePermissions(
        featureUuid,
        groupUUIDs,
        elementUuid,
        hierarchyUUIDs
      );
      expect(result).to.be.null;
    });

    it('should return null if no scope exist', async () => {
      sandbox.stub(DbFeatureComposition, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
      sandbox.stub(DbPermission, 'findAll').resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as DbPermission[]);
      sandbox.stub(DbFeature, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as DbFeature);
      sandbox.stub(DbScope, 'findOne').resolves(null);
      const result = await authUtils.checkParentFeaturePermissions(
        featureUuid,
        groupUUIDs,
        elementUuid,
        hierarchyUUIDs
      );
      expect(result).to.be.null;
    });

    it('should return "deny" when a parent permission denies access', async () => {
      sandbox.stub(DbFeatureComposition, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
      sandbox.stub(DbPermission, 'findAll').resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as DbPermission[]);
      sandbox.stub(DbFeature, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as DbFeature);
      sandbox.stub(DbScope, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);

      const result = await authUtils.checkParentFeaturePermissions(
        featureUuid,
        groupUUIDs,
        elementUuid,
        hierarchyUUIDs
      );
      expect(result).to.equal("deny");
    });

    it('should return "grant" when a parent permission grants access', async () => {
      sandbox.stub(DbFeatureComposition, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
      sandbox.stub(DbPermission, 'findAll').resolves([{ is_deny: false, scope_element_uuid: elementUuid }] as DbPermission[]);
      sandbox.stub(DbFeature, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as DbFeature);
      sandbox.stub(DbScope, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);

      const result = await authUtils.checkParentFeaturePermissions(
        featureUuid,
        groupUUIDs,
        elementUuid,
        hierarchyUUIDs
      );
      expect(result).to.equal("grant");
    });

    it('should evaluate nested ancestor permissions and return "deny" if any ancestor denies access', async () => {
      const compositionsStub = sandbox.stub(DbFeatureComposition, 'findAll');
      compositionsStub.withArgs({ where: { child_uuid: featureUuid } }).resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
      compositionsStub.withArgs({ where: { child_uuid: 'parentFeature' } }).resolves([{ parent_uuid: 'grandparentFeature' }] as DbFeatureComposition[]);
      compositionsStub.callsFake(() => Promise.resolve([]));

      const permissionStub = sandbox.stub(DbPermission, 'findAll');
      permissionStub.withArgs({ where: { feature_uuid: 'parentFeature', group_uuid: groupUUIDs } })
        .resolves([{ is_deny: false, scope_element_uuid: "otherElementUuid" }] as DbPermission[]);
      permissionStub.withArgs({ where: { feature_uuid: 'grandparentFeature', group_uuid: groupUUIDs } })
        .resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as DbPermission[]);

      sandbox.stub(DbFeature, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as DbFeature);
      sandbox.stub(DbScope, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);

      const result = await authUtils.checkParentFeaturePermissions(
        featureUuid,
        groupUUIDs,
        elementUuid,
        hierarchyUUIDs
      );
      expect(result).to.equal("deny");
    });

    it('should return null when a no permission with correpsonding element found', async () => {
      sandbox.stub(DbFeatureComposition, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
      sandbox.stub(DbPermission, 'findAll').resolves([{ is_deny: true, scope_element_uuid: "differentElementUuid" }] as DbPermission[]);
      sandbox.stub(DbFeature, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as DbFeature);
      sandbox.stub(DbScope, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);

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
    beforeEach(() => {
      sandbox = sinon.createSandbox()
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should throw an error if scope does not exist ', async () => {
      sandbox.stub(DbUserGroup, 'findAll').withArgs({ where: { uuid: ['group1'] } }).resolves([{ uuid: 'group1' }] as DbUserGroup[]);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'] } }).resolves([
        { feature_uuid: 'feature1', is_deny: false, scope_element_uuid: 'scope1' }
      ] as DbPermission[]);
      sandbox.stub(DbFeature, 'findOne').withArgs({ where: { uuid: 'feature1' } }).resolves({ scope_uuid: 'scopeA' } as DbFeature);
      sandbox.stub(DbScope, 'findOne').withArgs({ where: { uuid: 'scopeA' } }).resolves(null);

      try {
        await authUtils.verifyGroupCollision(['group1']);
        throw new Error('Test failed: error was not thrown');
      } catch (err: any) {
        expect(err.message).to.equal("No scope found");
      }
    });

    it('should skip if feature does not exist ', async () => {
      sandbox.stub(DbUserGroup, 'findAll').withArgs({ where: { uuid: ['group1'] } }).resolves([{ uuid: 'group1' }] as DbUserGroup[]);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'] } }).resolves([
        { feature_uuid: 'feature1', is_deny: false, scope_element_uuid: 'scope1' }
      ] as DbPermission[]);
      sandbox.stub(DbFeature, 'findOne').withArgs({ where: { uuid: 'feature1' } }).resolves(null);

      const result = await authUtils.verifyGroupCollision(['group1']);
      expect(result).to.deep.equal([]);
    });

    it('should return conflicts when grant is overridden by deny', async () => {
      sandbox.stub(DbUserGroup, 'findAll').withArgs({ where: { uuid: ['group1'] } }).resolves([{ uuid: 'group1' }] as DbUserGroup[]);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'] } }).resolves([
        { feature_uuid: 'feature1', is_deny: false, scope_element_uuid: 'scope1' }
      ] as DbPermission[]);
      sandbox.stub(DbFeature, 'findOne').withArgs({ where: { uuid: 'feature1' } }).resolves({ scope_uuid: 'scopeA' } as DbFeature);
      sandbox.stub(DbScope, 'findOne').withArgs({ where: { uuid: 'scopeA' } }).resolves({ code: 'scope_code' } as DbScope);
      sandbox.stub(authUtils, 'checkParentFeaturePermissions').resolves("deny");

      const result = await authUtils.verifyGroupCollision(['group1']);
      expect(result).to.deep.equal([{
        conflictType: "grant_overridden_by_deny",
        permissions: [{ feature_uuid: 'feature1', is_deny: false, scope_element_uuid: 'scope1' }],
      }]);
    });
  });
  describe('getSpecificElementDeny', () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });
    afterEach(() => {
      sandbox.restore();
    });
    it('should return an empty array if the user is not found', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves(null);
      const result = await authUtils.getSpecificElementDeny('test@example.com', 'featureCode');
      expect(result).to.deep.equal([]);
    });
    it('should return an empty array if the user has no group memberships', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' } }).resolves([] as DbUserGroupMember[]);
      const result = await authUtils.getSpecificElementDeny('test@example.com', 'featureCode');
      expect(result).to.deep.equal([]);
    });
    it('should return an empty array if the feature is not found', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' } }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbFeature, 'findOne').withArgs({ where: { code: 'featureCode' } }).resolves(null);

      const result = await authUtils.getSpecificElementDeny('test@example.com', 'featureCode');
      expect(result).to.deep.equal([]);
    });
    it('should return an empty array if there are no deny permissions', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' } }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbFeature, 'findOne').withArgs({ where: { code: 'featureCode' } }).resolves({ uuid: 'feature1' } as DbFeature);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'], is_deny: true } }).resolves([]);
      sandbox.stub(authUtils, 'checkAncestorEffectivePermissions').resolves({
        inherited: true,
        permissions: [],
      });

      const result = await authUtils.getSpecificElementDeny('test@example.com', 'featureCode');
      expect(result).to.deep.equal([]);
    });

    it('should return scope element UUIDs for valid deny permissions', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' } }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbFeature, 'findOne').withArgs({ where: { code: 'featureCode' } }).resolves({ uuid: 'feature1' } as DbFeature);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'], is_deny: true } }).resolves([
        { feature_uuid: 'feature1', scope_element_uuid: 'scopeElement1' },
      ] as DbPermission[]);
      sandbox.stub(authUtils, 'checkAncestorEffectivePermissions').resolves({
        inherited: true,
        permissions: [
          { scope_element_uuid: 'scopeElement2', scope_uuid: 'scope1', feature_code: 'featureCode', is_deny: true },
        ],
      });

      const result = await authUtils.getSpecificElementDeny('test@example.com', 'featureCode');
      expect(result).to.deep.equal(['scopeElement1', 'scopeElement2']);
    });
    it('should return empty array if nothing valid is found', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' } }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbFeature, 'findOne').withArgs({ where: { code: 'featureCode' } }).resolves({ uuid: 'feature1' } as DbFeature);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'], is_deny: true } }).resolves([
        { feature_uuid: 'feature2', scope_element_uuid: 'scopeElement1' },
      ] as DbPermission[]);
      sandbox.stub(authUtils, 'checkAncestorEffectivePermissions').resolves({
        inherited: true,
        permissions: [],
      });
      const result = await authUtils.getSpecificElementDeny('test@example.com', 'featureCode');
      expect(result).to.deep.equal([]);
    });
  });
  describe('getAllUniqueElement', () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should exclude permissions with no scope_element_uuid or feature_uuid', async () => {
      const invalidPermissions = [
        { scope_element_uuid: null, feature_uuid: 'featureUuid1', is_deny: false },
        { scope_element_uuid: 'elementUuid1', feature_uuid: null, is_deny: false },
      ] as unknown as DbPermission[];

      const result = await authUtils.getAllUniqueElement(invalidPermissions);
      expect(result).to.deep.equal([]);
    });

    it('should return an empty array if no feature exist', async () => {
      const permissions = [
        { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false },
      ] as DbPermission[];
      sandbox.stub(DbFeature, 'findByPk').withArgs('featureUuid1').resolves(null);
      const result = await authUtils.getAllUniqueElement(permissions);
      expect(result).to.deep.equal([]);
    });
    it('should return an empty array if no scope exist', async () => {
      const permissions = [
        { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false },
      ] as DbPermission[];
      sandbox.stub(DbFeature, 'findByPk').withArgs('featureUuid1').resolves({ scope_uuid: 'scope1' } as DbFeature);
      sandbox.stub(DbScope, 'findByPk').withArgs('scope1').resolves(null);
      const result = await authUtils.getAllUniqueElement(permissions);
      expect(result).to.deep.equal([]);
    });

    it('should exclude permissions marked as deny', async () => {
      const permissions = [
        { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false },
        { scope_element_uuid: 'elementUuid2', feature_uuid: 'featureUuid2', is_deny: true },
      ] as DbPermission[];

      sandbox.stub(DbFeature, 'findByPk').withArgs('featureUuid1').resolves({ scope_uuid: 'scope1' } as DbFeature)
        .withArgs('featureUuid2').resolves({ scope_uuid: 'scope2' } as DbFeature);

      sandbox.stub(DbScope, 'findByPk').withArgs('scope1').resolves({ uuid: 'scope1', code: 'scopeCode1' } as DbScope)
        .withArgs('scope2').resolves({ uuid: 'scope2', code: 'scopeCode2' } as DbScope);

      (authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves([]);
      const result = await authUtils.getAllUniqueElement(permissions);
      expect(result).to.deep.equal(['elementUuid1']);
    });

    it('should return unique elements when no higher elements exist', async () => {
      const permissions = [
        { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false },
        { scope_element_uuid: 'elementUuid2', feature_uuid: 'featureUuid2', is_deny: false },
      ] as DbPermission[];

      sandbox.stub(DbFeature, 'findByPk').withArgs('featureUuid1').resolves({ scope_uuid: 'scope1' } as DbFeature)
        .withArgs('featureUuid2').resolves({ scope_uuid: 'scope2' } as DbFeature);

      sandbox.stub(DbScope, 'findByPk').withArgs('scope1').resolves({ uuid: 'scope1', code: 'scopeCode1' } as DbScope)
        .withArgs('scope2').resolves({ uuid: 'scope2', code: 'scopeCode2' } as DbScope);

      (authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid1').resolves(['elementUuid1'])
        .withArgs('elementUuid2').resolves(['elementUuid2']);

      const result = await authUtils.getAllUniqueElement(permissions);
      expect(result).to.deep.equal(['elementUuid1', 'elementUuid2']);
    });

    it('should exclude elements that are encompassed by higher elements in the hierarchy', async () => {
      const permissions = [
        { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false },
        { scope_element_uuid: 'elementUuid2', feature_uuid: 'featureUuid2', is_deny: false },
      ] as DbPermission[];

      sandbox.stub(DbFeature, 'findByPk').withArgs('featureUuid1').resolves({ scope_uuid: 'scope1' } as DbFeature)
        .withArgs('featureUuid2').resolves({ scope_uuid: 'scope2' } as DbFeature);

      sandbox.stub(DbScope, 'findByPk').withArgs('scope1').resolves({ uuid: 'scope1', code: 'scopeCode1' } as DbScope)
        .withArgs('scope2').resolves({ uuid: 'scope2', code: 'scopeCode2' } as DbScope);

      (authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid1').resolves(['elementUuid2', 'elementUuid1'])
        .withArgs('elementUuid2').resolves(['elementUuid2']);

      const result = await authUtils.getAllUniqueElement(permissions);
      expect(result).to.deep.equal(['elementUuid2']);
    });

    it('should include elements that appears more than once', async () => {
      const permissions = [
        { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false },
        { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid2', is_deny: false },
      ] as DbPermission[];

      sandbox.stub(DbFeature, 'findByPk').withArgs('featureUuid1').resolves({ scope_uuid: 'scope1' } as DbFeature)
        .withArgs('featureUuid2').resolves({ scope_uuid: 'scope2' } as DbFeature);

      sandbox.stub(DbScope, 'findByPk').withArgs('scope1').resolves({ uuid: 'scope1', code: 'scopeCode1' } as DbScope)
        .withArgs('scope2').resolves({ uuid: 'scope2', code: 'scopeCode2' } as DbScope);

      (authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid1').resolves(['elementUuid1'])

      const result = await authUtils.getAllUniqueElement(permissions);
      expect(result).to.deep.equal(['elementUuid1']);
    });
  });
  describe('getPermissionsScopeElement', () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return an empty array if user is not found', async () => {
      sandbox.stub(DbUser, 'findOne').resolves(null);
      sandbox.stub(DbScope, 'findOne').resolves({ uuid: 'scopeUuid' } as DbScope);

      const result = await authUtils.getPermissionsScopeElement('user@example.com', 'scopeCode', 'elementUuid');
      expect(result).to.deep.equal([]);
    });

    it('should return an empty array if scope is not found', async () => {
      sandbox.stub(DbUser, 'findOne').resolves({ uuid: 'userUuid' } as DbUser);
      sandbox.stub(DbScope, 'findOne').resolves(null);

      const result = await authUtils.getPermissionsScopeElement('user@example.com', 'scopeCode', 'elementUuid');
      expect(result).to.deep.equal([]);
    });

    it('should return an empty array if the user has no group memberships', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbScope, 'findOne').withArgs({ where: { code: 'scopeCode' } }).resolves({ uuid: 'scope1' } as DbScope);
      sandbox.stub(DbFeature, 'findAll').withArgs({ where: { scope_uuid: ['scope1'] } }).resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' }, raw: true }).resolves([]);

      sandbox.stub(featureUtils, 'getAllChildScopes').resolves([]);
      const result = await authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
      expect(result).to.deep.equal([]);
    });

    it('should return an empty array if there are no deny permissions', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbScope, 'findOne').withArgs({ where: { code: 'scopeCode' } }).resolves({ uuid: 'scope1' } as DbScope);
      sandbox.stub(DbFeature, 'findAll').withArgs({ where: { scope_uuid: ['scope1'] } }).resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' }, raw: true }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'] }, raw: true }).resolves([]);

      sandbox.stub(authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });

      sandbox.stub(featureUtils, 'getAllChildScopes').resolves([]);
      (authUtils.options.scopeElementAncestor as sinon.SinonStub)
        .resolves([]);

      const result = await authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
      expect(result).to.deep.equal([]);
    });

    it('should return permissions for each feature found', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbScope, 'findOne').withArgs({ where: { code: 'scopeCode' } }).resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' }, raw: true }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbFeature, 'findAll').withArgs({ where: { scope_uuid: ['scope1'] } }).resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'] }, raw: true }).resolves([
        { feature_uuid: 'feature1', scope_element_uuid: 'scopeElement', is_deny: true }
      ] as DbPermission[]);

      sandbox.stub(authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });

      sandbox.stub(featureUtils, 'getAllChildScopes').resolves([]);
      (authUtils.options.scopeElementAncestor as sinon.SinonStub)
        .resolves([]);

      const result = await authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
      expect(result).to.deep.equal([
        {
          featureCode: 'featureCode',
          scopeCode: 'scopeCode',
          permissions: [
            { uuid: 'scopeElement', status: 'deny' }
          ]
        }
      ]);
    });

    it('should handle inherited permissions of higher hierarchy correctly', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbScope, 'findOne').withArgs({ where: { code: 'scopeCode' } }).resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' }, raw: true }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbFeature, 'findAll').withArgs({ where: { scope_uuid: ['scope1'] } }).resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'] }, raw: true }).resolves([]);

      sandbox.stub(DbScope, 'findByPk').withArgs('scope2').resolves({ uuid: 'scope2', code: 'scopeCodeAncestor' } as DbScope);

      sandbox.stub(authUtils, 'checkAncestorEffectivePermissions').resolves({
        inherited: true,
        permissions: [
          { scope_uuid: 'scope2', scope_element_uuid: 'ancestor1', feature_code: 'featureCode', is_deny: true },
          { scope_uuid: 'scope2', scope_element_uuid: 'ancestor1', feature_code: 'featureCode', is_deny: false }
        ]
      });

      sandbox.stub(featureUtils, 'getAllChildScopes').resolves([]);
      (authUtils.options.scopeElementAncestor as sinon.SinonStub)
        .withArgs('ancestor1', 'scopeCodeAncestor').resolves(['ancestor1'])
        .withArgs('scopeElement', 'scopeCode').resolves(['ancestor1', 'scopeElement']);

      const result = await authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
      expect(result).to.deep.equal([
        {
          featureCode: 'featureCode',
          scopeCode: 'scopeCode',
          permissions: [
            { uuid: 'scopeElement', status: 'deny' },
            { uuid: "scopeElement", status: "grant" }
          ]
        }
      ]);
    });
    it('should handle inherited permissions of lower hierarchy correctly', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbScope, 'findOne').withArgs({ where: { code: 'scopeCode' } }).resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' }, raw: true }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbFeature, 'findAll').withArgs({ where: { scope_uuid: ['scope1'] } }).resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'] }, raw: true }).resolves([]);

      sandbox.stub(DbScope, 'findByPk').withArgs('scope2').resolves({ uuid: 'scope2', code: 'scopeCodeDescendant' } as DbScope);

      sandbox.stub(authUtils, 'checkAncestorEffectivePermissions').resolves({
        inherited: true,
        permissions: [
          { scope_uuid: 'scope2', scope_element_uuid: 'descendant1', feature_code: 'featureCode', is_deny: true },
          { scope_uuid: 'scope2', scope_element_uuid: 'descendant1', feature_code: 'featureCode', is_deny: false }
        ]
      });

      sandbox.stub(featureUtils, 'getAllChildScopes').resolves([]);
      (authUtils.options.scopeElementAncestor as sinon.SinonStub)
        .withArgs('descendant1', 'scopeCodeDescendant').resolves(['scopeElement', 'descendant1'])
        .withArgs('scopeElement', 'scopeCode').resolves(['scopeElement']);

      const result = await authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
      expect(result).to.deep.equal([
        {
          featureCode: 'featureCode',
          scopeCode: 'scopeCode',
          permissions: [
            { uuid: 'descendant1', status: 'deny' },
            { uuid: 'descendant1', status: 'grant' }
          ]
        }
      ]);
    });
    it('should skip permissions with non-existent features', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbScope, 'findOne').withArgs({ where: { code: 'scopeCode' } }).resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' }, raw: true }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbFeature, 'findAll').withArgs({ where: { scope_uuid: ['scope1'] } }).resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'] }, raw: true }).resolves([
        { feature_uuid: 'nonExistentFeature', scope_element_uuid: 'scopeElement', is_deny: false }
      ] as DbPermission[]);

      sandbox.stub(DbScope, 'findByPk').withArgs('scope2').resolves({ uuid: 'scope2', code: 'scopeCodeDescendant' } as DbScope);

      sandbox.stub(authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });
      sandbox.stub(featureUtils, 'getAllChildScopes').resolves([]);
      (authUtils.options.scopeElementAncestor as sinon.SinonStub)
        .withArgs('descendant1', 'scopeCodeDescendant').resolves(['scopeElement', 'descendant1'])
        .withArgs('scopeElement', 'scopeCode').resolves(['scopeElement']);
      const result = await authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
      expect(result).to.deep.equal([]);
    });
    it('should process direct and inherited permissions and handle missing element scopes', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbScope, 'findOne').withArgs({ where: { code: 'scopeCode' } }).resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' }, raw: true }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbFeature, 'findAll').withArgs({ where: { scope_uuid: ['scope1'] } }).resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);

      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'] }, raw: true }).resolves([
        { feature_uuid: 'feature1', scope_element_uuid: 'scopeElement', is_deny: false }
      ] as DbPermission[]);

      sandbox.stub(DbScope, 'findByPk')
        .withArgs('scope2').resolves({ uuid: 'scope2', code: 'scopeCodeDescendant' } as DbScope)
        .withArgs('missingScope').resolves(null);

      sandbox.stub(authUtils, 'checkAncestorEffectivePermissions').resolves({
        inherited: true,
        permissions: [
          { scope_uuid: 'scope2', scope_element_uuid: 'descendant1', feature_code: 'featureCode', is_deny: true },
          { scope_uuid: 'missingScope', scope_element_uuid: 'missingElement', feature_code: 'featureCode', is_deny: false } // Missing scope
        ]
      });

      sandbox.stub(featureUtils, 'getAllChildScopes').resolves([]);
      (authUtils.options.scopeElementAncestor as sinon.SinonStub)
        .withArgs('descendant1', 'scopeCodeDescendant').resolves(['scopeElement', 'descendant1'])
        .withArgs('scopeElement', 'scopeCode').resolves(['scopeElement']);

      const result = await authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
      expect(result).to.deep.equal([
        {
          featureCode: 'featureCode',
          scopeCode: 'scopeCode',
          permissions: [
            { uuid: 'scopeElement', status: 'grant' },
            { uuid: 'descendant1', status: 'deny' }
          ]
        }
      ]);
    });

    it('should handle inherited permissions of unknown hierarchy correctly', async () => {
      sandbox.stub(DbUser, 'findOne').withArgs({ where: { email: 'test@example.com' } }).resolves({ uuid: 'user1' } as DbUser);
      sandbox.stub(DbScope, 'findOne').withArgs({ where: { code: 'scopeCode' } }).resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
      sandbox.stub(DbUserGroupMember, 'findAll').withArgs({ where: { user_uuid: 'user1' }, raw: true }).resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
      sandbox.stub(DbFeature, 'findAll').withArgs({ where: { scope_uuid: ['scope1'] } }).resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
      sandbox.stub(DbPermission, 'findAll').withArgs({ where: { group_uuid: ['group1'] }, raw: true }).resolves([]);

      sandbox.stub(DbScope, 'findByPk').withArgs('scope2').resolves({ uuid: 'scope2', code: 'scopeCodeUnknown' } as DbScope);

      sandbox.stub(authUtils, 'checkAncestorEffectivePermissions').resolves({
        inherited: true,
        permissions: [
          { scope_uuid: 'scope2', scope_element_uuid: 'unknown1', feature_code: 'featureCode', is_deny: true }
        ]
      });

      sandbox.stub(featureUtils, 'getAllChildScopes').resolves([]);
      (authUtils.options.scopeElementAncestor as sinon.SinonStub)
        .withArgs('unknown1', 'scopeCodeUnknown').resolves(['unknown1'])
        .withArgs('scopeElement', 'scopeCode').resolves(['scopeElement']);

      const result = await authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
      expect(result).to.deep.equal([]);
    });
  });
});
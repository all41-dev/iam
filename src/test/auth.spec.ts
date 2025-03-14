import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import { AuthUserTable } from '../db/auth-user-table';
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { FeatureTable } from "../db/feature-table";
import { Model } from "sequelize-typescript";
import { AuthUtils } from '../utils/auth-utils';


describe('Auth Process', () => {
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

describe("checkPermission", () => {
  let sandbox: sinon.SinonSandbox;
  let findAllStub: sinon.SinonStub;
  let checkAncestorPermissionsStub: sinon.SinonStub;
  let authUtils: AuthUtils

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    authUtils = AuthUtils.getInstance()
    findAllStub = sandbox.stub(Model, "findAll");
    checkAncestorPermissionsStub = sandbox.stub(authUtils, "checkAncestorPermissions");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return isDeny true if auth_user_uuid is not provided", async () => {

    const result = await authUtils.checkPermission("", "feature-uuid");

    expect(result.isDeny).to.be.true;
    expect(result.error).to.equal("User not found");
  });

  it("should return isDeny true if user is not in any group", async () => {
    findAllStub.resolves([]);

    const result = await authUtils.checkPermission("user-uuid", "feature-uuid");

    expect(result.isDeny).to.be.true;
    expect(result.error).to.equal("User not in any group");
  });

  it("should return isDeny true if no permissions are found", async () => {
    findAllStub.onCall(0).resolves([{ group_uuid: "group-uuid" }]);
    findAllStub.onCall(1).resolves([]);

    const result = await authUtils.checkPermission("user-uuid", "feature-uuid");

    expect(result.isDeny).to.be.true;
    expect(result.error).to.equal("No permissions found");
  });

  it("should return isDeny true if ancestor denies permission", async () => {
    findAllStub.onCall(0).resolves([{ group_uuid: "group-uuid" }]);
    findAllStub.onCall(1).resolves([{ is_deny: false }]);
    checkAncestorPermissionsStub.resolves(true);

    const result = await authUtils.checkPermission("user-uuid", "feature-uuid");

    expect(result.isDeny).to.be.true;
    expect(result.error).to.equal("Permission denied by ancestor");
  });
  it("should return isDeny false if permissions are allowed", async () => {
    findAllStub.onCall(0).resolves([{ group_uuid: "group-uuid" }]);
    findAllStub.onCall(1).resolves([{ is_deny: false }]);
    checkAncestorPermissionsStub.resolves(false);

    const result = await authUtils.checkPermission("user-uuid", "feature-uuid");

    expect(result.isDeny).to.be.false;
  });
});



describe("checkUserPermissions", () => {
  let sandbox: sinon.SinonSandbox;
  let findAllStub: sinon.SinonStub;
  let featureFindAllStub: sinon.SinonStub;
  let checkAncestorPermissionsStub: sinon.SinonStub;
  let authUtils: AuthUtils

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    authUtils = AuthUtils.getInstance()
    findAllStub = sandbox.stub(UserGroupMemberTable, "findAll");
    featureFindAllStub = sandbox.stub(FeatureTable, "findAll");
    checkAncestorPermissionsStub = sandbox.stub(authUtils, "checkAncestorPermissions");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return error if auth_user_uuid is not provided", async () => {

    const result = await authUtils.checkUserPermissions("");

    expect(result.permissions).to.be.undefined;
    expect(result.error).to.equal("User not found");
  });

  it("should return permissions map based on user's group memberships", async () => {
    findAllStub.resolves([{ dataValues: { group_uuid: "group-uuid" } }]);
    featureFindAllStub.resolves([
      {
        uuid: "feature-uuid",
        permissions: [{ feature_uuid: "feature-uuid", is_deny: false }],
      },
    ]);
    checkAncestorPermissionsStub.resolves(false);

    const result = await authUtils.checkUserPermissions("user-uuid");

    expect(result.permissions).to.deep.equal({ "feature-uuid": false });
  });

  it("should return permissions map with deny if ancestor denies permission", async () => {
    findAllStub.resolves([{ dataValues: { group_uuid: "group-uuid" } }]);
    featureFindAllStub.resolves([
      {
        uuid: "feature-uuid",
        permissions: [{ feature_uuid: "feature-uuid", is_deny: false }],
      },
    ]);
    checkAncestorPermissionsStub.resolves(true);

    const result = await authUtils.checkUserPermissions("user-uuid");

    expect(result.permissions).to.deep.equal({ "feature-uuid": true });
  });

  it("should return permissions map with deny if any permission is deny", async () => {
    findAllStub.resolves([{ dataValues: { group_uuid: "group-uuid" } }]);
    featureFindAllStub.resolves([
      {
        uuid: "feature-uuid",
        permissions: [{ feature_uuid: "feature-uuid", is_deny: true }],
      },
    ]);
    checkAncestorPermissionsStub.resolves(false);

    const result = await authUtils.checkUserPermissions("user-uuid");

    expect(result.permissions).to.deep.equal({ "feature-uuid": true });
  });
});

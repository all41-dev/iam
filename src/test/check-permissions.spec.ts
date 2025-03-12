import { expect } from "chai";
import sinon from "sinon";
import { checkUserPermissions, checkPermission } from "../utils/check-permissions";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import * as AncestorPermissionsModule from "../utils/check-ancestor-permission";
import { FeatureTable } from "../db/feature-table";
import { Model } from "sequelize-typescript";

describe("checkPermission", () => {
  let sandbox: sinon.SinonSandbox;
  let findAllStub: sinon.SinonStub;
  let checkAncestorPermissionsStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    findAllStub = sandbox.stub(Model, "findAll");
    checkAncestorPermissionsStub = sandbox.stub(AncestorPermissionsModule, "checkAncestorPermissions");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return isDeny true if auth_user_uuid is not provided", async () => {

    const result = await checkPermission("", "feature-uuid");

    expect(result.isDeny).to.be.true;
    expect(result.error).to.equal("User not found");
  });

  it("should return isDeny true if user is not in any group", async () => {
    findAllStub.resolves([]);

    const result = await checkPermission("user-uuid", "feature-uuid");

    expect(result.isDeny).to.be.true;
    expect(result.error).to.equal("User not in any group");
  });

  it("should return isDeny true if no permissions are found", async () => {
    findAllStub.onCall(0).resolves([{ group_uuid: "group-uuid" }]);
    findAllStub.onCall(1).resolves([]);

    const result = await checkPermission("user-uuid", "feature-uuid");

    expect(result.isDeny).to.be.true;
    expect(result.error).to.equal("No permissions found");
  });

  it("should return isDeny true if ancestor denies permission", async () => {
    findAllStub.onCall(0).resolves([{ group_uuid: "group-uuid" }]);
    findAllStub.onCall(1).resolves([{ is_deny: false }]);
    checkAncestorPermissionsStub.resolves(true);

    const result = await checkPermission("user-uuid", "feature-uuid");

    expect(result.isDeny).to.be.true;
    expect(result.error).to.equal("Permission denied by ancestor");
  });

  it("should return isDeny true if any permission is deny", async () => {
    findAllStub.onCall(0).resolves([{ group_uuid: "group-uuid" }]);
    findAllStub.onCall(1).resolves([{ is_deny: true }]);
    checkAncestorPermissionsStub.resolves(false);

    const result = await checkPermission("user-uuid", "feature-uuid");

    expect(result.isDeny).to.be.true;
    expect(result.error).to.equal("Permission denied");
  });

  it("should return isDeny false if permissions are allowed", async () => {
    findAllStub.onCall(0).resolves([{ group_uuid: "group-uuid" }]);
    findAllStub.onCall(1).resolves([{ is_deny: false }]);
    checkAncestorPermissionsStub.resolves(false);

    const result = await checkPermission("user-uuid", "feature-uuid");

    expect(result.isDeny).to.be.false;
  });
});



describe("checkUserPermissions", () => {
  let sandbox: sinon.SinonSandbox;
  let findAllStub: sinon.SinonStub;
  let featureFindAllStub: sinon.SinonStub;
  let checkAncestorPermissionsStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    findAllStub = sandbox.stub(UserGroupMemberTable, "findAll");
    featureFindAllStub = sandbox.stub(FeatureTable, "findAll");
    checkAncestorPermissionsStub = sandbox.stub(AncestorPermissionsModule, "checkAncestorPermissions");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return error if auth_user_uuid is not provided", async () => {

    const result = await checkUserPermissions("");

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

    const result = await checkUserPermissions("user-uuid");

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

    const result = await checkUserPermissions("user-uuid");

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

    const result = await checkUserPermissions("user-uuid");

    expect(result.permissions).to.deep.equal({ "feature-uuid": true });
  });
});

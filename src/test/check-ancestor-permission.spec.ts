import { expect } from "chai";
import sinon from "sinon";
import { checkAncestorPermissions } from "../utils/check-ancestor-permission";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { PermissionTable } from "../db/permission-table";

describe("checkAncestorPermissions", () => {
  let sandbox: sinon.SinonSandbox;
  let findOneStub: sinon.SinonStub;
  let findAllStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    findOneStub = sandbox.stub(FeatureCompositionTable, "findOne");
    findAllStub = sandbox.stub(PermissionTable, "findAll");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return false if no composition is found", async () => {
    findOneStub.resolves(null);

    const result = await checkAncestorPermissions("some-feature-uuid", ["group1"]);

    expect(result).to.be.false;
    expect(findOneStub.calledOnce).to.be.true;
    expect(findAllStub.notCalled).to.be.true;
  });

  it("should return true if a deny permission is found", async () => {
    findOneStub.resolves({ parent_uuid: "parent-uuid" });
    findAllStub.resolves([{ is_deny: true }]);

    const result = await checkAncestorPermissions("some-feature-uuid", ["group1"]);

    expect(result).to.be.true;
    expect(findOneStub.calledOnce).to.be.true;
    expect(findAllStub.calledOnce).to.be.true;
  });

  it("should return false if no deny permissions are found and no ancestor denies", async () => {
    findOneStub.onCall(0).resolves({ parent_uuid: "parent-uuid" });
    findOneStub.onCall(1).resolves(null);
    findAllStub.resolves([{ is_deny: false }]);

    const result = await checkAncestorPermissions("some-feature-uuid", ["group1"]);

    expect(result).to.be.false;
    expect(findOneStub.callCount).to.equal(2);
    expect(findAllStub.calledOnce).to.be.true;
  });

  it("should return true if an ancestor has a deny permission", async () => {
    findOneStub.onCall(0).resolves({ parent_uuid: "parent-uuid" });
    findOneStub.onCall(1).resolves({ parent_uuid: "ancestor-uuid" });

    findAllStub.onCall(0).resolves([{ is_deny: false }]);
    findAllStub.onCall(1).resolves([{ is_deny: true }]);

    const result = await checkAncestorPermissions("some-feature-uuid", ["group1"]);

    expect(result).to.be.true;
    expect(findOneStub.callCount).to.equal(2);
    expect(findAllStub.callCount).to.equal(2);
  });
});

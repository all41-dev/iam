import { assert, expect } from "chai";
import sinon from "sinon";
import { FeatureManager } from "../auth/feature-manager";
import { ScopeTable } from "../db/scope-table";
import { FeatureTable } from "../db/feature-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";

describe("FeatureManager", () => {
  let featureManager: FeatureManager;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    featureManager = FeatureManager.getInstance();
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getAllChildScopes", () => {
    it("should return all child scopes recursively", async () => {
      const scopeUuid = "scope-1";

      sandbox.stub(ScopeTable, "findAll")
        .onFirstCall().resolves([{ uuid: "scope-2", parent_uuid: "scope-1" }] as ScopeTable[])
        .onSecondCall().resolves([{ uuid: "scope-3", parent_uuid: "scope-2" }] as ScopeTable[])
        .onThirdCall().resolves([]);

      const result = await featureManager.getAllChildScopes(scopeUuid);

      expect(result).to.have.members(["scope-2", "scope-3"]);
    });

    it("should return an empty array if scopeUuid is already visited", async () => {
      const scopeUuid = "scope-1";
      const visited = new Set<string>(["scope-1"]);

      sandbox.stub(ScopeTable, "findAll").resolves([]);

      const result = await featureManager.getAllChildScopes(scopeUuid, visited);

      expect(result).to.be.an("array").that.is.empty;
    });


    it("should return all child scopes with multiple children", async () => {
      const scopeUuid = "scope-1";

      sandbox.stub(ScopeTable, "findAll")
        .onCall(0).resolves([{ uuid: "scope-2", parent_uuid: "scope-1" }] as ScopeTable[])
        .onCall(1).resolves([{ uuid: "scope-3", parent_uuid: "scope-2" }] as ScopeTable[])
        .onCall(2).resolves([{ uuid: "scope-4", parent_uuid: "scope-2" }] as ScopeTable[])
        .onCall(3).resolves([]);

      const result = await featureManager.getAllChildScopes(scopeUuid);

      expect(result).to.have.members(["scope-2", "scope-3", "scope-4"]);
    });

    it("should handle cyclic dependencies", async () => {
      const scopeUuid = "scope-1";

      sandbox.stub(ScopeTable, "findAll")
        .onFirstCall().resolves([{ uuid: "scope-2", parent_uuid: "scope-1" }] as ScopeTable[])
        .onSecondCall().resolves([{ uuid: "scope-1", parent_uuid: "scope-2" }] as ScopeTable[]);

      const result = await featureManager.getAllChildScopes(scopeUuid);

      expect(result).to.have.members(["scope-2"]);
    });
  });

  describe("buildScopesTree", () => {
    it("should throw an error if scope is not found", async () => {
      const scopeUuid = "scope-1";
      const visited = new Set<string>();

      sandbox.stub(ScopeTable, "findByPk")
        .withArgs("scope-1").resolves(undefined);

      try {
        await featureManager.buildScopesTree(scopeUuid, visited);
        assert.fail("Expected error was not thrown");
      } catch (error) {
        const err = error as Error;
        expect(err.message).to.equal(`Scope with UUID ${scopeUuid} not found`);
      }
    });

    it("should build the scope tree structure", async () => {
      const scopeUuid = "scope-1";
      const scope1 = { uuid: "scope-1", name: "Scope 1", code: "S1", parent_uuid: null } as unknown as ScopeTable;
      const scope2 = { uuid: "scope-2", name: "Scope 2", code: "S2", parent_uuid: "scope-1" } as unknown as ScopeTable;

      sandbox.stub(ScopeTable, "findByPk")
        .withArgs("scope-1").resolves(scope1)
        .withArgs("scope-2").resolves(scope2);

      sandbox.stub(ScopeTable, "findAll")
        .withArgs({ where: { parent_uuid: "scope-1" } }).resolves([scope2])
        .withArgs({ where: { parent_uuid: "scope-2" } }).resolves([]);

      sandbox.stub(ScopeTable, "findOne")
        .withArgs({ where: { uuid: "scope-1" } }).resolves(scope1)

      const visited = new Set<string>();

      const result = await featureManager.buildScopesTree(scopeUuid, visited);

      expect(result).to.deep.equal({
        uuid: "scope-1",
        name: "Scope 1",
        code: "S1",
        parents: [],
        children: [
          {
            uuid: "scope-2",
            name: "Scope 2",
            code: "S2",
            parents: [{ uuid: "scope-1", cyclic: true }],
            children: []
          }
        ]
      });
    });
  });

  describe("buildFeatureMatrix", () => {
    it("should throw an error if feature is not found", async () => {
      const featureUuid = "feature-1";
      const visited = new Set<string>();

      sandbox.stub(FeatureTable, "findByPk")
        .withArgs("feature-1").resolves(undefined);

      try {
        await featureManager.buildFeatureMatrix(featureUuid, visited);
        assert.fail("Expected error was not thrown");
      } catch (error) {
        const err = error as Error;
        expect(err.message).to.equal(`Feature with UUID ${featureUuid} not found`);
      }
    });

    it("should build the feature matrix structure", async () => {
      const featureUuid = "feature-1";
      const feature1 = { uuid: "feature-1", name: "Feature 1", code: "F1" } as unknown as FeatureTable;
      const feature2 = { uuid: "feature-2", name: "Feature 2", code: "F2" } as unknown as FeatureTable;
      const feature3 = { uuid: "feature-3", name: "Feature 3", code: "F3" } as unknown as FeatureTable;

      const parentFeatureRelation = { parent_uuid: "feature-1", child_uuid: "feature-2" } as unknown as FeatureCompositionTable;
      const childFeatureRelation = { parent_uuid: "feature-2", child_uuid: "feature-3" } as unknown as FeatureCompositionTable;

      sandbox.stub(FeatureTable, "findByPk")
        .withArgs("feature-1").resolves(feature1)
        .withArgs("feature-2").resolves(feature2)
        .withArgs("feature-3").resolves(feature3);

      sandbox.stub(FeatureCompositionTable, "findAll")
        .withArgs({ where: { child_uuid: "feature-1" } }).resolves([])
        .withArgs({ where: { parent_uuid: "feature-1" } }).resolves([parentFeatureRelation])
        .withArgs({ where: { child_uuid: "feature-2" } }).resolves([parentFeatureRelation])
        .withArgs({ where: { parent_uuid: "feature-2" } }).resolves([childFeatureRelation])
        .withArgs({ where: { child_uuid: "feature-3" } }).resolves([childFeatureRelation])
        .withArgs({ where: { parent_uuid: "feature-3" } }).resolves([]);

      const visited = new Set<string>();
      const validScopes = new Set<string>(["feature-1", "feature-2", "feature-3"]);

      const result = await featureManager.buildFeatureMatrix(featureUuid, visited, validScopes);

      expect(result).to.deep.equal({
        uuid: "feature-1",
        name: "Feature 1",
        code: "F1",
        parents: [],
        children: [
          {
            uuid: "feature-2",
            name: "Feature 2",
            code: "F2",
            parents: [
              {
                uuid: "feature-1",
                cyclic: true
              }
            ],
            children: [
              {
                uuid: "feature-3",
                name: "Feature 3",
                code: "F3",
                parents: [
                  {
                    uuid: "feature-2",
                    cyclic: true
                  }
                ],
                children: []
              }
            ]
          }
        ]
      });
    });
  });



  describe("getHighestScope", () => {
    it("should return the highest scope UUID", async () => {
      const scopes = [
        { uuid: "scope-1", parent_uuid: null },
        { uuid: "scope-2", parent_uuid: "scope-1" },
        { uuid: "scope-3", parent_uuid: "scope-2" }
      ];

      const result = await featureManager.getHighestScope(scopes as any);

      expect(result).to.equal("scope-1");
    });

    it("should return null if no scopes are provided", async () => {
      const result = await featureManager.getHighestScope([]);

      expect(result).to.be.null;
    });
  });
});

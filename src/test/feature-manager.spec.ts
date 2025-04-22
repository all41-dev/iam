import { assert, expect } from "chai";
import sinon from "sinon";
import { FeatureManager } from "../auth/feature-manager";
import { ScopeTable } from "../db/scope-table";
import { FeatureTable } from "../db/feature-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { UserGroupTable } from "../db/user-group-table";

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

      sandbox.stub(ScopeTable, "findOne").resolves(undefined);

      try {
        await featureManager.buildScopesTree(visited);
        assert.fail("Expected error was not thrown");
      } catch (error) {
        const err = error as Error;
        expect(err.message).to.equal(`Scope not found`);
      }
    });

    it("should build the scope tree structure", async () => {
      const scope1 = { uuid: "scope-1", name: "Scope 1", code: "S1", parent_uuid: null } as unknown as ScopeTable;
      const scope2 = { uuid: "scope-2", name: "Scope 2", code: "S2", parent_uuid: "scope-1" } as unknown as ScopeTable;
      sandbox.stub(ScopeTable, "findOne").resolves(scope1)

      sandbox.stub(ScopeTable, "findByPk")
        .withArgs("scope-2").resolves(scope2);

      sandbox.stub(ScopeTable, "findAll")
        .withArgs({ where: { parent_uuid: "scope-1" } }).resolves([scope2])
        .withArgs({ where: { parent_uuid: "scope-2" } }).resolves([]);

      const visited = new Set<string>();

      const result = await featureManager.buildScopesTree(visited);

      expect(result).to.deep.equal({
        uuid: "scope-1",
        name: "Scope 1",
        code: "S1",
        children: [
          {
            uuid: "scope-2",
            name: "Scope 2",
            code: "S2",
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

      const feature1 = { uuid: "feature-1", name: "Feature 1", code: "F1", scope_uuid: "scope-1" } as FeatureTable;
      const feature2 = { uuid: "feature-2", name: "Feature 2", code: "F2", scope_uuid: "scope-2" } as FeatureTable;
      const feature3 = { uuid: "feature-3", name: "Feature 3", code: "F3", scope_uuid: "scope-3" } as FeatureTable;

      const parentFeatureRelation = { parent_uuid: "feature-1", child_uuid: "feature-2" } as FeatureCompositionTable;
      const childFeatureRelation = { parent_uuid: "feature-2", child_uuid: "feature-3" } as FeatureCompositionTable;

      const scope1 = { uuid: "scope-1", code: "S1" } as ScopeTable;
      const scope2 = { uuid: "scope-2", code: "S2" } as ScopeTable;
      const scope3 = { uuid: "scope-3", code: "S3" } as ScopeTable;

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

      sandbox.stub(ScopeTable, "findByPk")
        .withArgs("scope-1").resolves(scope1)
        .withArgs("scope-2").resolves(scope2)
        .withArgs("scope-3").resolves(scope3);

      const visited = new Set<string>();
      const validScopes = new Set<string>(["scope-1", "scope-2", "scope-3"]);

      const result = await featureManager.buildFeatureMatrix(featureUuid, visited, validScopes);

      expect(result).to.deep.equal({
        uuid: "feature-1",
        name: "Feature 1",
        scope_code: "S1",
        code: "F1",
        parents: [],
        children: [
          {
            uuid: "feature-2",
            name: "Feature 2",
            scope_code: "S2",
            code: "F2",
            parents: [
              {
                uuid: "feature-1",
                code: "F1",
                cyclic: true,
              }
            ],
            children: [
              {
                uuid: "feature-3",
                name: "Feature 3",
                scope_code: "S3",
                code: "F3",
                parents: [
                  {
                    uuid: "feature-2",
                    code: "F2",
                    cyclic: true,
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

  describe('getDirectParentFeatures', () => {
    let findAllStub: sinon.SinonStub;

    beforeEach(() => {
      findAllStub = sinon.stub();

      sinon.replace(FeatureCompositionTable, 'findAll', findAllStub);
      sinon.replace(FeatureTable, 'findAll', findAllStub);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return an empty array if no parent relations are found', async () => {
      findAllStub.withArgs({ where: { child_uuid: 'feature1' } }).resolves([]);

      const result = await featureManager.getDirectParentFeatures('feature1');
      expect(result).to.deep.equal([]);
    });

    it('should return parent features for a given feature UUID', async () => {
      findAllStub.withArgs({ where: { child_uuid: 'feature1' } }).resolves([
        { parent_uuid: 'parent1' },
        { parent_uuid: 'parent2' },
      ]);
      findAllStub.withArgs({ where: { uuid: ['parent1', 'parent2'] } }).resolves([
        { uuid: 'parent1', name: 'Parent Feature 1' },
        { uuid: 'parent2', name: 'Parent Feature 2' },
      ]);

      const result = await featureManager.getDirectParentFeatures('feature1');
      expect(result).to.deep.equal([
        { uuid: 'parent1', name: 'Parent Feature 1' },
        { uuid: 'parent2', name: 'Parent Feature 2' },
      ]);
    });
  });

  describe('getHighestFeatureInScope', () => {
    let findByPkStub: sinon.SinonStub;
    let getDirectParentFeaturesStub: sinon.SinonStub;

    beforeEach(() => {
      findByPkStub = sinon.stub();
      getDirectParentFeaturesStub = sinon.stub();
      sinon.replace(FeatureTable, 'findByPk', findByPkStub);
      sinon.replace(featureManager, 'getDirectParentFeatures', getDirectParentFeaturesStub);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return null if no parent features are in the allowed scopes', async () => {
      getDirectParentFeaturesStub.withArgs('feature1').resolves([]);
      findByPkStub.resolves(null);

      const result = await featureManager.getHighestFeatureInScope('feature1', new Set(['scope1']));
      expect(result).to.be.null;
    });

    it('should return the feature itself if no valid parent features are found', async () => {
      getDirectParentFeaturesStub.withArgs('feature1').resolves([]);
      findByPkStub.withArgs('feature1').resolves({ uuid: 'feature1', scope_uuid: 'scope1' });

      const result = await featureManager.getHighestFeatureInScope('feature1', new Set(['scope1']));
      expect(result).to.deep.equal({ uuid: 'feature1', scope_uuid: 'scope1' });
    });

    it('should recursively find the highest feature in the allowed scopes', async () => {
      getDirectParentFeaturesStub.withArgs('feature1').resolves([
        { uuid: 'parent1', scope_uuid: 'scope2' },
        { uuid: 'parent2', scope_uuid: 'scope1' },
      ] as FeatureTable[]);

      getDirectParentFeaturesStub.withArgs('parent1').resolves([]);
      getDirectParentFeaturesStub.withArgs('parent2').resolves([]);

      findByPkStub.withArgs('parent2').resolves({ uuid: 'parent2', scope_uuid: 'scope1' });

      const result = await featureManager.getHighestFeatureInScope('feature1', new Set(['scope1', 'scope2']));
      expect(result).to.deep.equal({ uuid: 'parent2', scope_uuid: 'scope1' });
    });
  });

  describe('getGroupsScopeList', () => {
    let findAllStub: sinon.SinonStub;
    let getAllChildScopesStub: sinon.SinonStub;

    beforeEach(() => {
      findAllStub = sinon.stub();
      getAllChildScopesStub = sinon.stub();
      sinon.replace(UserGroupTable, 'findAll', findAllStub);
      sinon.replace(featureManager, 'getAllChildScopes', getAllChildScopesStub);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return an empty array if no groups are found', async () => {
      findAllStub.resolves([]);
      const result = await featureManager.getGroupsScopeList(['group1', 'group2']);
      expect(result).to.deep.equal([]);
    });

    it('should return unique scopes including child scopes', async () => {
      findAllStub.resolves([
        { dataValues: { scope_uuid: 'scope1' } },
        { dataValues: { scope_uuid: 'scope2' } },
      ]);

      getAllChildScopesStub.withArgs('scope1').resolves(['childScope1', 'childScope2']);
      getAllChildScopesStub.withArgs('scope2').resolves(['childScope3']);

      const result = await featureManager.getGroupsScopeList(['group1', 'group2']);
      expect(result).to.deep.equal(['scope1', 'scope2', 'childScope1', 'childScope2', 'childScope3']);
    });

    it('should handle cases with no child scopes', async () => {
      findAllStub.resolves([{ dataValues: { scope_uuid: 'scope1' } }]);
      getAllChildScopesStub.withArgs('scope1').resolves([]);

      const result = await featureManager.getGroupsScopeList(['group1']);
      expect(result).to.deep.equal(['scope1']);
    });
  });
  describe('checkForCircularDependency', () => {
    let findAllStub: sinon.SinonStub;

    beforeEach(() => {
      findAllStub = sinon.stub();
      sinon.replace(FeatureCompositionTable, 'findAll', findAllStub);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return true for direct circular dependency', async () => {
      const result = await featureManager.checkForCircularDependency('feature1', 'feature1');
      expect(result).to.be.true;
    });

    it('should return false if there are no child dependencies', async () => {
      findAllStub.resolves([]);
      const result = await featureManager.checkForCircularDependency('feature1', 'feature2');
      expect(result).to.be.false;
    });

    it('should return true for indirect circular dependency', async () => {
      findAllStub.withArgs({ where: { child_uuid: 'feature1' } }).resolves([
        { parent_uuid: 'feature2' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature2' } }).resolves([
        { parent_uuid: 'feature3' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature3' } }).resolves([
        { parent_uuid: 'feature1' },
      ]);

      const result = await featureManager.checkForCircularDependency('feature1', 'feature3');
      expect(result).to.be.true;
    });

    it('should return true if circular dependency exists higher in hierarchy', async () => {
      findAllStub.withArgs({ where: { child_uuid: 'feature1' } }).resolves([
        { parent_uuid: 'feature2' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature2' } }).resolves([
        { parent_uuid: 'feature3' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature3' } }).resolves([]);

      const result = await featureManager.checkForCircularDependency('feature1', 'feature3');
      expect(result).to.be.true;
    });
    it('should return false if no circular dependency exists', async () => {
      findAllStub.withArgs({ where: { child_uuid: 'feature1' } }).resolves([
        { parent_uuid: 'feature2' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature2' } }).resolves([
        { parent_uuid: 'feature3' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature3' } }).resolves([]);

      const result = await featureManager.checkForCircularDependency('feature1', 'feature4');
      expect(result).to.be.false;
    });
  });
  describe('getHighestFeatures', () => {
    let findAllStub: sinon.SinonStub;

    beforeEach(() => {
      findAllStub = sinon.stub();

      sinon.replace(FeatureCompositionTable, 'findAll', findAllStub);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return an empty array if no feature UUIDs are provided', async () => {
      const result = await featureManager.getHighestFeatures([]);
      expect(result).to.deep.equal([]);
    });

    it('should return the feature itself if it has no parents', async () => {
      findAllStub.withArgs({ where: { child_uuid: 'feature1' } }).resolves([]);

      const result = await featureManager.getHighestFeatures(['feature1']);
      expect(result).to.deep.equal(['feature1']);
    });

    it('should return only the highest features when no ancestors exist in the list', async () => {
      findAllStub.withArgs({ where: { child_uuid: 'feature1' } }).resolves([
        { parent_uuid: 'feature2' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature2' } }).resolves([]);

      const result = await featureManager.getHighestFeatures(['feature1', 'feature2']);
      expect(result).to.deep.equal(['feature2']);
    });

    it('should return only the highest features when some have ancestors in the list', async () => {
      findAllStub.withArgs({ where: { child_uuid: 'feature1' } }).resolves([
        { parent_uuid: 'feature2' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature2' } }).resolves([
        { parent_uuid: 'feature3' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature3' } }).resolves([]);

      const result = await featureManager.getHighestFeatures(['feature1', 'feature2', 'feature3']);
      expect(result).to.deep.equal(['feature3']);
    });

    it('should handle circular dependencies without infinite recursion', async () => {
      findAllStub.withArgs({ where: { child_uuid: 'feature1' } }).resolves([
        { parent_uuid: 'feature2' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature2' } }).resolves([
        { parent_uuid: 'feature3' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature3' } }).resolves([
        { parent_uuid: 'feature1' },
      ]);

      const result = await featureManager.getHighestFeatures(['feature1', 'feature2', 'feature3']);
      expect(result).to.deep.equal([]);
    });

    it('should handle multiple unrelated features correctly', async () => {
      findAllStub.withArgs({ where: { child_uuid: 'feature1' } }).resolves([]);
      findAllStub.withArgs({ where: { child_uuid: 'feature2' } }).resolves([]);
      findAllStub.withArgs({ where: { child_uuid: 'feature3' } }).resolves([
        { parent_uuid: 'feature4' },
      ]);
      findAllStub.withArgs({ where: { child_uuid: 'feature4' } }).resolves([]);

      const result = await featureManager.getHighestFeatures(['feature1', 'feature2', 'feature3', 'feature4']);
      expect(result).to.deep.equal(['feature1', 'feature2', 'feature4']);
    });
  });
});

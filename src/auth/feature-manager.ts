import { ScopeTable } from "../db/scope-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { FeatureTable } from "../db/feature-table";
import { UserGroupTable } from "../db/user-group-table";

export class FeatureManager {
  private static instance: FeatureManager;

  public static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager();
    }
    return FeatureManager.instance;
  }

  public async getHighestFeatureInScope(featureUuid: string, allScopeUuids: Set<string>): Promise<FeatureTable | null> {
    const parentFeatures = await this.getDirectParentFeatures(featureUuid);

    const validParentFeatures = parentFeatures.filter(parent =>
      allScopeUuids.has(parent.scope_uuid)
    );

    for (const parentFeature of validParentFeatures) {
      const highestFeature = await this.getHighestFeatureInScope(parentFeature.uuid, allScopeUuids);
      if (highestFeature) {
        return highestFeature;
      }
    }

    return validParentFeatures.length === 0 ? await FeatureTable.findByPk(featureUuid) : null;
  }

  public async getDirectParentFeatures(featureUuid: string): Promise<FeatureTable[]> {
    const parentRelations = await FeatureCompositionTable.findAll({
      where: { child_uuid: featureUuid },
    });

    const parentUuids = parentRelations.map(relation => relation.parent_uuid);
    return await FeatureTable.findAll({
      where: { uuid: parentUuids },
    });
  }

  public async getAllChildScopes(scopeUuid: string, visited: Set<string> = new Set()): Promise<string[]> {
    if (visited.has(scopeUuid)) return [];
    visited.add(scopeUuid);

    const childScopes = await ScopeTable.findAll({
      where: { parent_uuid: scopeUuid },
    });

    const childScopeUuids = childScopes.map((scope) => scope.uuid);
    const uniqueUuids = new Set<string>();

    for (const childUuid of childScopeUuids) {
      if (!visited.has(childUuid)) {
        const descendantUuids = await this.getAllChildScopes(childUuid, visited);
        descendantUuids.forEach((uuid) => uniqueUuids.add(uuid));
      }
      uniqueUuids.add(childUuid);
    }

    uniqueUuids.delete(scopeUuid);

    return Array.from(uniqueUuids);
  }

  public async buildScopesTree(scope_uuid: string, visited: Set<string>): Promise<any> {
    if (visited.has(scope_uuid)) return [{ uuid: scope_uuid, cyclic: true }];
    visited.add(scope_uuid);

    const scope = await ScopeTable.findByPk(scope_uuid);
    if (!scope) throw new Error(`Scope with UUID ${scope_uuid} not found`);

    let parentFeatures = [];
    if (scope.parent_uuid) {
      const parent = await ScopeTable.findOne({
        where: { uuid: scope.parent_uuid }
      });
      if (parent) {
        parentFeatures = await this.buildScopesTree(parent.uuid, visited);
      }
    }

    const children = await ScopeTable.findAll({
      where: { parent_uuid: scope_uuid },
    });
    const childFeatures = await Promise.all(
      children.map(async (child) => {
        return await this.buildScopesTree(child.uuid, visited);
      })
    );
    return {
      uuid: scope.uuid,
      name: scope.name,
      code: scope.code,
      parents: parentFeatures,
      children: childFeatures
    };
  }

  public async buildFeatureMatrix(featureUuid: string, visited: Set<string>, validScopes?: Set<string>): Promise<any> {
    if (visited.has(featureUuid)) return {
      uuid: featureUuid,
      code: (await FeatureTable.findByPk(featureUuid))?.code,
      cyclic: true
    };
    visited.add(featureUuid);

    const feature = await FeatureTable.findByPk(featureUuid);
    if (!feature) throw new Error(`Feature with UUID ${featureUuid} not found`);

    const children = await FeatureCompositionTable.findAll({
      where: { parent_uuid: featureUuid },
    });
    const childFeatures = await Promise.all(
      children.map(async (child) => {
        return await this.buildFeatureMatrix(child.child_uuid, visited, validScopes);
      })
    );
    const parents = await FeatureCompositionTable.findAll({
      where: { child_uuid: featureUuid },
    });
    const validParents = [];
    for (const parent of parents) {
      if (!validScopes) {
        validParents.push(parent);
      } else {
        const parentFeature = await FeatureTable.findByPk(parent.parent_uuid);
        if (parentFeature && parentFeature.scope_uuid && validScopes.has(parentFeature.scope_uuid)) {
          validParents.push(parent);
        }
      }
    }
    const parentFeatures = await Promise.all(
      validParents.map(async (parent) => {
        return await this.buildFeatureMatrix(parent.parent_uuid, visited, validScopes);
      })
    );

    return {
      uuid: feature.uuid,
      name: feature.name,
      code: feature.code,
      parents: parentFeatures,
      children: childFeatures
    };
  }

  public async getGroupsScopeList(groupUUIDs: string[]): Promise<string[]> {
    const groups = await UserGroupTable.findAll({ where: { uuid: groupUUIDs } });
    const scopeUUIDs = groups.map((group) => group.dataValues.scope_uuid);

    const allChildScopes = await Promise.all(
      scopeUUIDs.map((scopeUuid) => this.getAllChildScopes(scopeUuid))
    );

    const flatChildScopes = allChildScopes.flat();
    const combinedScopes = [...scopeUUIDs, ...flatChildScopes];

    return Array.from(new Set(combinedScopes));
  }
  public async checkForCircularDependency(parentUuid: string, childUuid: string): Promise<boolean> {
    if (parentUuid === childUuid) return true
    const children = await FeatureCompositionTable.findAll({
      where: { child_uuid: parentUuid }
    });
    if (!children.length) return false
    for (const child of children) {
      if (child.parent_uuid === childUuid) return true;
      const isCircular = await this.checkForCircularDependency(child.parent_uuid, childUuid);
      if (isCircular) return true;
    }
    return false;
  }
}


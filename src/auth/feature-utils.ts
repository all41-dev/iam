import { DbScope } from "../db/db-scope";
import { DbFeatureComposition } from "../db/db-feature-composition";
import { DbFeature } from "../db/db-feature";
import { DbUserGroup } from "../db/db-user-group";

export class FeatureUtils {
  private static instance: FeatureUtils;

  public static getInstance(): FeatureUtils {
    if (!FeatureUtils.instance) {
      FeatureUtils.instance = new FeatureUtils();
    }
    return FeatureUtils.instance;
  }

  public async getHighestFeatureInScope(featureUuid: string, allScopeUuids: Set<string>): Promise<DbFeature | null> {
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

    return validParentFeatures.length === 0 ? await DbFeature.findByPk(featureUuid) : null;
  }

  async getDirectParentFeatures(featureUuid: string): Promise<DbFeature[]> {
    const parentRelations = await DbFeatureComposition.findAll({
      where: { child_uuid: featureUuid },
    });

    const parentUuids = parentRelations.map(relation => relation.parent_uuid);
    if (parentUuids.length === 0) return [];
    return await DbFeature.findAll({
      where: { uuid: parentUuids },
    });
  }

  public async getAllChildScopes(scopeUuid: string, visited: Set<string> = new Set()): Promise<string[]> {
    if (visited.has(scopeUuid)) return [];
    visited.add(scopeUuid);

    const childScopes = await DbScope.findAll({
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

  public async buildScopesTree(visited: Set<string>, child_uuid?: string): Promise<any> {
    const scope = child_uuid ? await DbScope.findByPk(child_uuid) : await DbScope.findOne({ where: { parent_uuid: null } });
    if (!scope) throw new Error(`Scope not found`);
    if (visited.has(scope.uuid)) return [{ uuid: scope.uuid, cyclic: true }];
    visited.add(scope.uuid);
    const children = await DbScope.findAll({
      where: { parent_uuid: scope.uuid },
    });
    const childScopes = await Promise.all(
      children.map((child) => this.buildScopesTree(visited, child.uuid))
    );
    return {
      uuid: scope.uuid,
      name: scope.name,
      code: scope.code,
      children: childScopes,
    };
  }

  public async buildFeatureMatrix(featureUuid: string, visited: Set<string>, validScopes?: Set<string>): Promise<any> {
    if (visited.has(featureUuid)) return {
      uuid: featureUuid,
      code: (await DbFeature.findByPk(featureUuid))?.code,
      cyclic: true
    };
    visited.add(featureUuid);

    const feature = await DbFeature.findByPk(featureUuid);
    if (!feature) throw new Error(`Feature with UUID ${featureUuid} not found`);

    const children = await DbFeatureComposition.findAll({
      where: { parent_uuid: featureUuid },
    });
    const childFeatures = await Promise.all(
      children.map(async (child) => {
        return await this.buildFeatureMatrix(child.child_uuid, visited, validScopes);
      })
    );
    const parents = await DbFeatureComposition.findAll({
      where: { child_uuid: featureUuid },
    });
    const validParents = [];
    for (const parent of parents) {
      if (!validScopes) {
        validParents.push(parent);
      } else {
        const parentFeature = await DbFeature.findByPk(parent.parent_uuid);
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
    const scope = await DbScope.findByPk(feature.scope_uuid);
    if (!scope) throw new Error(`Scope with UUID ${feature.scope_uuid} not found`);
    return {
      uuid: feature.uuid,
      name: feature.name,
      scope_code: scope.code,
      code: feature.code,
      parents: parentFeatures,
      children: childFeatures
    };
  }

  public async getGroupsScopeList(groupUUIDs: string[]): Promise<string[]> {
    const groups = await DbUserGroup.findAll({ where: { uuid: groupUUIDs } });
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
    const children = await DbFeatureComposition.findAll({
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

  public async getHighestFeatures(featureUuids: string[]): Promise<string[]> {
    const highestFeatures: string[] = [];
    const parentMap = new Map<string, string[]>();
    const uniqueFeatureUuid = new Set(featureUuids);
    for (const featureUuid of featureUuids) {
      const visited = new Set<string>();
      const isHighest = !(await this.hasAncestorInList(featureUuid, uniqueFeatureUuid, visited, parentMap));
      if (isHighest) highestFeatures.push(featureUuid);
    }
    return highestFeatures;
  }

  public async hasAncestorInList(featureUuid: string, allUuids: Set<string>, visited: Set<string>, parentMap: Map<string, string[]>): Promise<boolean> {
    if (visited.has(featureUuid)) return false;
    visited.add(featureUuid);
    let parents;
    if (parentMap.has(featureUuid)) parents = parentMap.get(featureUuid)!;
    parents = await DbFeatureComposition.findAll({
      where: { child_uuid: featureUuid },
    });
    const parentUuids = parents.map(p => p.parent_uuid);
    parentMap.set(featureUuid, parentUuids);
    parents = parentUuids;
    for (const parentUuid of parents) {
      if (allUuids.has(parentUuid)) return true;
      if (await this.hasAncestorInList(parentUuid, allUuids, visited, parentMap)) return true;
    }
    return false;
  }
}


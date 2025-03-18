import { ScopeTable } from "../db/scope-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { FeatureTable } from "../db/feature-table";

export class FeatureManager {
  private static instance: FeatureManager;

  public static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager();
    }
    return FeatureManager.instance;
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
    if (visited.has(featureUuid)) return { uuid: featureUuid, cyclic: true };
    visited.add(featureUuid);

    const feature = await FeatureTable.findByPk(featureUuid);
    if (!feature) throw new Error(`Feature with UUID ${featureUuid} not found`);

    const parents = await FeatureCompositionTable.findAll({
      where: { child_uuid: featureUuid },
    });
    const parentFeatures = await Promise.all(
      parents
        .filter((parent) => !validScopes || validScopes.has(parent.parent_uuid))
        .map(async (parent) => {
          return await this.buildFeatureMatrix(parent.parent_uuid, visited, validScopes);
        })
    );
    const children = await FeatureCompositionTable.findAll({
      where: { parent_uuid: featureUuid },
    });
    const childFeatures = await Promise.all(
      children.map(async (child) => {
        return await this.buildFeatureMatrix(child.child_uuid, visited, validScopes);
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

  public async getHighestScope(scopes: ScopeTable[]): Promise<string | null> {
    if (!scopes || scopes.length === 0) {
      return null;
    }

    const scopeMap = new Map<string, string | null>();
    const visited = new Set<string>();

    scopes.forEach((scope) => {
      scopeMap.set(scope.uuid, scope.parent_uuid ? scope.parent_uuid : null);
    });

    let highestScopeUuid: string | null = null;

    for (const scope of scopes) {
      let currentUuid = scope.uuid;

      while (currentUuid && !visited.has(currentUuid)) {
        visited.add(currentUuid);
        const parentUuid = scopeMap.get(currentUuid);
        if (!parentUuid) {
          highestScopeUuid = currentUuid;
          break;
        }

        currentUuid = parentUuid;
      }
    }

    return highestScopeUuid;
  }
}


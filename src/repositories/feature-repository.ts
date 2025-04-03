import { RepositorySequelize } from "@all41-dev/server.types";
import { FeatureTable } from "../db/feature-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";
import { Op, Sequelize } from "sequelize";
import { FeatureManager } from "../auth/feature-manager";


export class RepositoryFeature extends RepositorySequelize<FeatureTable> {
  private featureManager: FeatureManager

  constructor(repository: SequelizeNativeRepository<FeatureTable>) {
    super(FeatureTable, repository);
    this.featureManager = FeatureManager.getInstance();
  }

  public async init() {
    return this;
  }

  public async setParentChild(parentId: string, childId: string) {
    if (await this.featureManager.checkForCircularDependency(parentId, childId)) return { error: `Circular dependency` };
    const parent = await this.getByKey(parentId);
    if (!parent) return { error: `Feature with uuid : ${parentId} not found` };
    const child = await this.getByKey(childId);
    if (!child) return { error: `Feature with uuid : ${parentId} not found` };
    const existingComposition = await FeatureCompositionTable.findOne({
      where: { parent_uuid: parentId, child_uuid: childId }
    });
    if (existingComposition) return { error: `Relation already exist` };
    await FeatureCompositionTable.create({
      parent_uuid: parent.uuid,
      child_uuid: child.uuid
    });
  }

  public async removeParentChild(parentId: string, childId: string) {
    const parent = await this.getByKey(parentId);
    if (!parent) return { error: `Feature with uuid : ${parentId} not found` };
    const child = await this.getByKey(childId);
    if (!child) return { error: `Feature with uuid : ${parentId} not found` };
    const existingComposition = await FeatureCompositionTable.findOne({
      where: { parent_uuid: parentId, child_uuid: childId }
    });
    if (!existingComposition) return { error: `Relation doesn't exist` };
    await FeatureCompositionTable.destroy({
      where: {
        parent_uuid: parent.uuid,
        child_uuid: child.uuid
      }
    });
  }

  public async getChildrens(featureUuid: string): Promise<string[]> {
    const childrenSet = new Set<string>();

    const recursiveGetChildren = async (uuid: string): Promise<void> => {
      if (childrenSet.has(uuid)) return;
      childrenSet.add(uuid);
      const compositions = await FeatureCompositionTable.findAll({
        where: { parent_uuid: uuid },
      });
      for (const { child_uuid } of compositions) {
        await recursiveGetChildren(child_uuid);
      }
    };

    await recursiveGetChildren(featureUuid);
    childrenSet.delete(featureUuid);

    return Array.from(childrenSet);
  }


  public async getFeatureMatrix(featureUuid: string): Promise<any> {
    const feature = await FeatureTable.findByPk(featureUuid)
    if (!feature) return {}
    const allChildUuids = await this.featureManager.getAllChildScopes(feature.scope_uuid);
    const allScopeUuids = new Set([feature.scope_uuid, ...allChildUuids]);
    const featureMatrix = await this.featureManager.buildFeatureMatrix(featureUuid, new Set(), allScopeUuids);
    return [featureMatrix]
  }

  public async getRootFeatureMatrix(): Promise<any> {
    const rootFeatures = await FeatureTable.findAll({
      where: {
        uuid: {
          [Op.notIn]: Sequelize.literal(
            `(SELECT DISTINCT child_uuid FROM ${FeatureCompositionTable.tableName})`
          ),
        },
      },
    });

    const matrices = await Promise.all(
      rootFeatures.map(async (rootFeature) => {
        return await this.featureManager.buildFeatureMatrix(rootFeature.uuid, new Set());
      })
    );

    return matrices;
  }

  public async getScopeFeatureMatrix(scopeUuid: string): Promise<any[]> {
    const allChildUuids = await this.featureManager.getAllChildScopes(scopeUuid);
    const allScopeUuids = new Set([scopeUuid, ...allChildUuids]);

    const features = await FeatureTable.findAll({
      where: { scope_uuid: Array.from(allScopeUuids) },
    });

    const visited = new Set<string>();
    const highestFeatures = new Set<string>();

    for (const feature of features) {
      const highestFeature = await this.featureManager.getHighestFeatureInScope(feature.uuid, allScopeUuids);

      if (highestFeature) {
        highestFeatures.add(highestFeature.uuid);
      }
    }

    const featureMatrixPromises = Array.from(highestFeatures).map(uuid =>
      this.featureManager.buildFeatureMatrix(uuid, visited, allScopeUuids)
    );
    const featureMatrix = await Promise.all(featureMatrixPromises);
    return featureMatrix;
  }
}
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
    const parent = await this.getByKey(parentId);
    const child = await this.getByKey(childId);
    await FeatureCompositionTable.create({
      parent_uuid: parent.uuid,
      child_uuid: child.uuid
    });
  }

  public async removeParentChild(parentId: string, childId: string) {
    const parent = await this.getByKey(parentId);
    const child = await this.getByKey(childId);
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
    return await this.featureManager.buildMatrix(featureUuid, new Set());
  }

  public async getRootMatrix(): Promise<any> {
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
        return await this.featureManager.buildMatrix(rootFeature.uuid, new Set());
      })
    );

    return matrices;
  }

  public async getScopeFeatureMatrix(scopeUuid: string): Promise<any[]> {
    const allScopeUuids = new Set(await this.featureManager.getAllChildScopes(scopeUuid));

    const features = await FeatureTable.findAll({
      where: { scope_uuid: Array.from(allScopeUuids) },
    });

    const visited = new Set<string>();
    const featureMatrix = await Promise.all(
      features.map(async (feature) =>
        this.featureManager.buildMatrix(feature.uuid, visited, allScopeUuids)
      )
    );

    return featureMatrix;
  }
}
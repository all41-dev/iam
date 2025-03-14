import { RepositorySequelize } from "@all41-dev/server.types";
import { FeatureTable } from "../db/feature-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";
import { Op, Sequelize } from "sequelize";


export class RepositoryFeature extends RepositorySequelize<FeatureTable> {
  constructor(repository: SequelizeNativeRepository<FeatureTable>) {
    super(FeatureTable, repository);
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
    return await this.buildMatrix(featureUuid, new Set());
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
        return await this.buildMatrix(rootFeature.uuid, new Set());
      })
    );

    return matrices;
  }

  public async buildMatrix(
    featureUuid: string,
    visited: Set<string>
  ): Promise<any> {
    if (visited.has(featureUuid)) {
      return { uuid: featureUuid, cyclic: true };
    }

    visited.add(featureUuid);

    const feature = await this.getByKey(featureUuid);

    if (!feature) throw new Error(`Feature with UUID ${featureUuid} not found`);

    const parents = await FeatureCompositionTable.findAll({
      where: { child_uuid: featureUuid },
    });

    const parentFeatures = await Promise.all(
      parents.map(async (parent) => {
        return await this.buildMatrix(parent.parent_uuid, visited);
      })
    );

    const children = await FeatureCompositionTable.findAll({
      where: { parent_uuid: featureUuid },
    });

    const childFeatures = await Promise.all(
      children.map(async (child) => {
        return await this.buildMatrix(child.child_uuid, visited);
      })
    );

    return {
      uuid: feature.uuid,
      name: feature.name,
      parents: parentFeatures,
      children: childFeatures,
    };
  }
}
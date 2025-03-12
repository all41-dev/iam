import { RepositorySequelize } from "@all41-dev/server.types";
import { FeatureTable } from "../db/feature-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";
import { checkFeatureChildren } from "../utils/check-feature-children";
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

  public async checkFeatureChildren(featureUuid: string) {
    return await checkFeatureChildren(featureUuid)
  }

  public async getFeatureTree(featureUuid: string | null): Promise<any> {
    const buildTree = async (parentUuid: string): Promise<any> => {
      const parentFeature = await this.getByKey(parentUuid);

      if (!parentFeature) {
        throw new Error(`Feature with UUID ${parentUuid} not found`);
      }

      const children = await FeatureCompositionTable.findAll({
        where: { parent_uuid: parentUuid },
      });

      const childFeatures = await Promise.all(
        children.map(async (child) => {
          return await buildTree(child.child_uuid);
        })
      );

      return {
        uuid: parentFeature.uuid,
        name: parentFeature.name,
        children: childFeatures,
      };
    };

    if (featureUuid) {
      return await buildTree(featureUuid);
    }

    const rootFeatures = await FeatureTable.findAll({
      where: {
        uuid: {
          [Op.notIn]: Sequelize.literal(
            `(SELECT DISTINCT child_uuid FROM ${FeatureCompositionTable.tableName})`
          ),
        },
      },
    });

    const trees = await Promise.all(
      rootFeatures.map(async (rootFeature) => {
        return await buildTree(rootFeature.uuid);
      })
    );

    return trees;
  }
}
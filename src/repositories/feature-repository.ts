import { RepositorySequelize } from "@all41-dev/server.types";
import { DbFeature } from "../db/db-feature";
import { DbFeatureComposition } from "../db/db-feature-composition";
import { Op, Sequelize } from "sequelize";
import { FeatureUtils } from "../auth/feature-utils";


export class RepositoryFeature extends RepositorySequelize<DbFeature> {
  private featureUtils: FeatureUtils

  constructor() {
    super(DbFeature);
    this.featureUtils = FeatureUtils.getInstance();
  }

  public async init() {
    return this;
  }

  public async setParentChild(parentId: string, childId: string) {
    if (await this.featureUtils.checkForCircularDependency(parentId, childId)) return { error: `Circular dependency` };
    const parent = await this.getByKey(parentId);
    if (!parent) return { error: `Feature with uuid : ${parentId} not found` };
    const child = await this.getByKey(childId);
    if (!child) return { error: `Feature with uuid : ${parentId} not found` };
    const existingComposition = await DbFeatureComposition.findOne({
      where: { parent_uuid: parentId, child_uuid: childId }
    });
    if (existingComposition) return { error: `Relation already exist` };
    await DbFeatureComposition.create({
      parent_uuid: parent.uuid,
      child_uuid: child.uuid
    } as any);
  }

  public async removeParentChild(parentId: string, childId: string) {
    const parent = await this.getByKey(parentId);
    if (!parent) return { error: `Feature with uuid : ${parentId} not found` };
    const child = await this.getByKey(childId);
    if (!child) return { error: `Feature with uuid : ${parentId} not found` };
    const existingComposition = await DbFeatureComposition.findOne({
      where: { parent_uuid: parentId, child_uuid: childId }
    });
    if (!existingComposition) return { error: `Relation doesn't exist` };
    await DbFeatureComposition.destroy({
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
      const compositions = await DbFeatureComposition.findAll({
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
    const feature = await DbFeature.findByPk(featureUuid)
    if (!feature) return {}
    const allChildUuids = await this.featureUtils.getAllChildScopes(feature.scope_uuid);
    const allScopeUuids = new Set([feature.scope_uuid, ...allChildUuids]);
    const featureMatrix = await this.featureUtils.buildFeatureMatrix(featureUuid, new Set(), allScopeUuids);
    return [featureMatrix]
  }

  public async getRootFeatureMatrix(): Promise<any> {
    const rootFeatures = await DbFeature.findAll({
      where: {
        uuid: {
          [Op.notIn]: Sequelize.literal(
            `(SELECT DISTINCT child_uuid FROM ${DbFeatureComposition.tableName})`
          ),
        },
      },
    });

    const matrices = await Promise.all(
      rootFeatures.map(async (rootFeature) => {
        return await this.featureUtils.buildFeatureMatrix(rootFeature.uuid, new Set());
      })
    );

    return matrices;
  }

  public async getScopeFeatureMatrix(scopeUuid: string): Promise<any[]> {
    const allChildUuids = await this.featureUtils.getAllChildScopes(scopeUuid);
    const allScopeUuids = new Set([scopeUuid, ...allChildUuids]);

    const features = await DbFeature.findAll({
      where: { scope_uuid: Array.from(allScopeUuids) },
    });

    const visited = new Set<string>();
    const highestFeatures = new Set<string>();

    for (const feature of features) {
      const highestFeature = await this.featureUtils.getHighestFeatureInScope(feature.uuid, allScopeUuids);

      if (highestFeature) {
        highestFeatures.add(highestFeature.uuid);
      }
    }

    const featureMatrixPromises = Array.from(highestFeatures).map(uuid =>
      this.featureUtils.buildFeatureMatrix(uuid, visited, allScopeUuids)
    );
    const featureMatrix = await Promise.all(featureMatrixPromises);
    return featureMatrix;
  }

  public async getAllFeatureComposition(): Promise<any> {
    const compositions = await DbFeatureComposition.findAll();
    return compositions
  }
}
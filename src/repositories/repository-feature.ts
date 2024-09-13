import { RepositorySequelize } from "@all41-dev/server";
import { Feature } from "../db/models/feature";
import { FeatureComposition } from "../db/models/feature_composition";

export class RepositoryFeature extends RepositorySequelize<Feature> {
  constructor(options?: { dbName?: string }) {
    super(Feature, options?.dbName);
  }

  public async init() {
    return this;
  }

  public async setParentChild(parentId: string, childId: string) {
    const parent = await this.getByKey(parentId);
    const child = await this.getByKey(childId);
    await FeatureComposition.create({
      parent_uuid: parent.uuid,
      child_uuid: child.uuid
    });
  }

  public async removeParentChild(parentId: string, childId: string) {
    const parent = await this.getByKey(parentId);
    const child = await this.getByKey(childId);
    await FeatureComposition.destroy({
      where: {
        parent_uuid: parent.uuid,
        child_uuid: child.uuid
      }
    });
  }
}
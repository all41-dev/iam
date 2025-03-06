import { RepositorySequelize } from "@all41-dev/server";
import { FeatureTable } from "../db/feature-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";

export class RepositoryFeature extends RepositorySequelize<FeatureTable> {
  constructor(options?: { dbName?: string }) {
    super(FeatureTable, options?.dbName);
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
}
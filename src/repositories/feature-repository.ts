import { RepositorySequelize } from "@all41-dev/server.types";
import { FeatureTable } from "../db/feature-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";


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
}
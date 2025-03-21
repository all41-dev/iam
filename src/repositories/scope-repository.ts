import { RepositorySequelize } from "@all41-dev/server.types";
import { ScopeTable } from "../db/scope-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";
import { FeatureManager } from "../auth/feature-manager";
import { UserGroupTable } from "../db/user-group-table";
import { FeatureTable } from "../db/feature-table";

export class RepositoryScope extends RepositorySequelize<ScopeTable> {
  private featureManager: FeatureManager;

  constructor(repository: SequelizeNativeRepository<ScopeTable>) {
    super(ScopeTable, repository);
    this.featureManager = FeatureManager.getInstance();
  }

  public async init() {
    return this;
  }

  public async getChildScopes(scopeUuid: string): Promise<string[]> {
    return await this.featureManager.getAllChildScopes(scopeUuid);
  }

  public async getTreeScopes(scopeUuid: string): Promise<any> {
    return await this.featureManager.buildScopesTree(scopeUuid, new Set());
  }

  public async getScopeGroups(scopeUuid: string): Promise<UserGroupTable[]> {
    const scope = await this.getByKey(scopeUuid);
    if (!scope) {
      throw new Error(`Scope with id ${scopeUuid} not found`);
    }
    const groups = await UserGroupTable.findAll({
      where: { scope_uuid: scopeUuid },
    });
    return groups;
  }

  public async getScopeFeatures(scopeUuid: string): Promise<FeatureTable[]> {
    const scope = await this.getByKey(scopeUuid);
    if (!scope) {
      throw new Error(`Scope with id ${scopeUuid} not found`);
    }
    const features = await FeatureTable.findAll({
      where: { scope_uuid: scopeUuid },
    });
    return features;
  }
}

import { RepositorySequelize } from "@all41-dev/server.types";
import { ScopeTable } from "../db/scope-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";
import { FeatureManager } from "../auth/feature-manager";

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
}

import { RepositorySequelize } from "@all41-dev/server.types";
import { ScopeTable } from "../db/scope-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";
import { FeatureManager } from "../auth/feature-manager";
import { UserGroupTable } from "../db/user-group-table";
import { FeatureTable } from "../db/feature-table";
import { AuthUtils } from "../auth/auth-utils";

export class RepositoryScope extends RepositorySequelize<ScopeTable> {
  private featureManager: FeatureManager;
  private authUtils: AuthUtils;

  constructor(repository: SequelizeNativeRepository<ScopeTable>) {
    super(ScopeTable, repository);
    this.featureManager = FeatureManager.getInstance();
    this.authUtils = AuthUtils.getInstance();
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

  public async getScopeChildrenFeatures(scopeUuid: string): Promise<FeatureTable[]> {
    const scope = await this.getByKey(scopeUuid);
    if (!scope) {
      throw new Error(`Scope with id ${scopeUuid} not found`);
    }
    const allChildUuids = await this.featureManager.getAllChildScopes(scopeUuid);
    const allScopeUuids = [scopeUuid, ...allChildUuids];
    const features = await FeatureTable.findAll({
      where: { scope_uuid: allScopeUuids },
    });
    return features;
  }

  public async getElementHierarchy(scopeUuid: string, elementUuid: string) {
    return await this.authUtils.buildScopeElementHierarchy(scopeUuid, elementUuid);
  }

  public async getAllElementHierarchy() {
    return await this.authUtils.buildScopeElementHierarchy();
  }
}

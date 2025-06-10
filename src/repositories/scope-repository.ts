import { RepositorySequelize } from "@all41-dev/server.types";
import { DbScope } from "../db/db-scope";
import { FeatureUtils } from "../auth/feature-utils";
import { DbUserGroup } from "../db/db-user-group";
import { DbFeature } from "../db/db-feature";
import { AuthUtils } from "../auth/auth-utils";

export class RepositoryScope extends RepositorySequelize<DbScope> {
  private featureUtils: FeatureUtils;
  private authUtils: AuthUtils;

  constructor() {
    super(DbScope);
    this.featureUtils = FeatureUtils.getInstance();
    this.authUtils = AuthUtils.getInstance();
  }

  public async init() {
    return this;
  }

  public async getChildScopes(scopeUuid: string): Promise<string[]> {
    return await this.featureUtils.getAllChildScopes(scopeUuid);
  }

  public async getTreeScopes(): Promise<any> {
    return await this.featureUtils.buildScopesTree(new Set());
  }

  public async getScopeGroups(scopeUuid: string): Promise<DbUserGroup[]> {
    const scope = await this.getByKey(scopeUuid);
    if (!scope) {
      throw new Error(`Scope with id ${scopeUuid} not found`);
    }
    const groups = await DbUserGroup.findAll({
      where: { scope_uuid: scopeUuid },
    });
    return groups;
  }

  public async getScopeFeatures(scopeUuid: string): Promise<DbFeature[]> {
    const scope = await this.getByKey(scopeUuid);
    if (!scope) throw new Error(`Scope with id ${scopeUuid} not found`);
    const features = await DbFeature.findAll({
      where: { scope_uuid: scopeUuid },
    });
    return features;
  }

  public async getScopeChildrenFeatures(scopeUuid: string): Promise<DbFeature[]> {
    const scope = await this.getByKey(scopeUuid);
    if (!scope) {
      throw new Error(`Scope with id ${scopeUuid} not found`);
    }
    const allChildUuids = await this.featureUtils.getAllChildScopes(scopeUuid);
    const allScopeUuids = [scopeUuid, ...allChildUuids];
    const features = await DbFeature.findAll({
      where: { scope_uuid: allScopeUuids },
    });
    return features;
  }

  public async getElementHierarchy(scopeCode: string, elementUuid: string) {
    return await this.authUtils.options.scopeElementHierarchy(scopeCode, elementUuid);
  }

  public async getAllElementHierarchy() {
    return await this.authUtils.options.scopeElementHierarchy();
  }
  public async getElementAncestor(scopeCode: string, elementUuid: string) {
    return await this.authUtils.options.scopeElementAncestor(scopeCode, elementUuid);
  }
}

import { AuthUserTable } from "../db/auth-user-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { PermissionTable } from "../db/permission-table";
import { FeatureTable } from "../db/feature-table";
import { UserGroupTable } from "../db/user-group-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { IUtilsOptions, PermissionContext } from "../interfaces";
import { ScopeTable } from "../db/scope-table";
import { FeatureManager } from "./feature-manager";


export class AuthUtils {

  private static instance: AuthUtils | undefined;
  private utilsOptions: IUtilsOptions;
  private featureManager: FeatureManager;

  private constructor(options: IUtilsOptions) {
    this.utilsOptions = options;
    this.featureManager = FeatureManager.getInstance();
  }

  public get options() {
    return this.utilsOptions;
  }

  public static getInstance(options?: IUtilsOptions) {
    if (!AuthUtils.instance) {
      if (!options) {
        throw new Error("AuthUtils not initialized");
      }
      AuthUtils.instance = new AuthUtils(options);
    }
    return AuthUtils.instance;
  }

  async checkUser(profile: any, provider: string): Promise<{ user: any; error?: string }> {
    const email = profile.emails[0].value;
    const displayName = profile.displayName;
    const firstName = profile.name?.givenName || displayName.split(' ')[0];
    let lastName = profile.name?.familyName || displayName.split(' ')[1];
    if (!lastName) lastName = '';

    return await AuthUserTable.findOne({ where: { email } }).then(async (user) => {
      if (!user) {
        await AuthUserTable.create({
          email,
          username: displayName,
          first_name: firstName,
          last_name: lastName,
          provider,
        });
        return { user: false, error: 'denied' };
      } else if (provider !== user.provider) {
        return { user: false, error: 'provider' };
      } else {
        if (!user.validated && user.validated === false) {
          return { user: false, error: 'not validated' };
        }
        const permissions = await this.getUserPermissions(user.uuid);
        return {
          user: {
            ...user.dataValues,
            permissions: permissions && Object.keys(permissions).length > 0 ? Buffer.from(JSON.stringify(permissions)).toString('base64') : undefined,
            permissionWarning: permissions && Object.keys(permissions).length > 0 ? undefined : 'no permissions',
          },
        };
      }
    });
  }

  public async getUserPermissions(userUuid: string): Promise<any> {
    const groupMemberships = await UserGroupMemberTable.findAll({
      where: { auth_user_uuid: userUuid },
    });
    if (!groupMemberships.length) return {};
    const groupUUIDs = groupMemberships.map((group) => group.group_uuid);
    const permissions = await PermissionTable.findAll({
      where: { group_uuid: groupUUIDs },
    });
    if (!permissions.length) return {};
    const featureUUIDs = permissions.map((permission) => permission.feature_uuid);
    const highestFeatures = await this.featureManager.getHighestFeatures(featureUUIDs);
    const uniqueElements = await this.getAllUniqueElement(permissions);
    const compactPermissions: Array<{ f: string; e: string; d: boolean; c?: string }> = [];
    for (const permission of permissions) {
      const isTop = highestFeatures.includes(permission.feature_uuid);
      const isUniq = uniqueElements.includes(permission.scope_element_uuid);
      const permissionObject: { f: string; e: string; d: boolean; c?: string; h?: boolean } = {
        f: permission.feature_uuid,
        e: permission.scope_element_uuid,
        d: permission.is_deny,
      };
      if (isTop && isUniq) {
        permissionObject.c = "top.uniq";
      } else if (isTop) {
        permissionObject.c = "top";
      } else if (isUniq) {
        permissionObject.c = "uniq";
      }
      compactPermissions.push(permissionObject);
    }
    return compactPermissions;
  }

  public async getAllUniqueElement(
    permissions: PermissionTable[],
  ): Promise<string[]> {
    const uniqueElements = new Set<string>();
    await Promise.all(
      permissions.map(async (permission) => {
        if (!permission.scope_element_uuid || !permission.feature_uuid || permission.is_deny === true) return;
        const feature = await FeatureTable.findByPk(permission.feature_uuid);
        if (!feature) return;
        const scope = await ScopeTable.findByPk(feature.scope_uuid);
        if (!scope) return;
        const hierarchyUUIDs = await this.options.scopeElementAncestor(
          permission.scope_element_uuid,
          scope.code
        );
        const isUnique = !permissions.some(p =>
          p.scope_element_uuid !== permission.scope_element_uuid &&
          hierarchyUUIDs.includes(p.scope_element_uuid)
        );
        if (isUnique) {
          uniqueElements.add(permission.scope_element_uuid);
        }
      })
    );
    return Array.from(uniqueElements);
  }

  public async checkAncestorEffectivePermissions(
    featureUuid: string,
    groupUUIDs: string[],
  ): Promise<{ inherited: boolean; permissions: { scope_element_uuid: string; scope_uuid: string; feature_code: string; is_deny: boolean }[] }> {
    const aggregatedPermissions: Array<{ scope_element_uuid: string; scope_uuid: string; feature_code: string; is_deny: boolean }> = [];
    const compositions = await FeatureCompositionTable.findAll({ where: { child_uuid: featureUuid } });
    if (!compositions.length) return { inherited: false, permissions: [] };
    const processPermissions = (permissions: any[], feature_code: string, scope_uuid: string) => {
      for (const p of permissions) {
        aggregatedPermissions.push({
          scope_element_uuid: p.scope_element_uuid,
          scope_uuid,
          feature_code,
          is_deny: p.is_deny,
        });
      }
    };
    for (const c of compositions) {
      const [currentPermissions, feature, ancestorPermissions] = await Promise.all([
        PermissionTable.findAll({ where: { feature_uuid: c.parent_uuid, group_uuid: groupUUIDs } }),
        FeatureTable.findByPk(c.parent_uuid),
        this.checkAncestorEffectivePermissions(c.parent_uuid, groupUUIDs),
      ]);
      if (feature) {
        processPermissions(currentPermissions, feature.code, feature.scope_uuid);
      }
      for (const p of ancestorPermissions.permissions) {
        processPermissions([p], p.feature_code, p.scope_uuid);
      }
    }
    return { inherited: aggregatedPermissions.length > 0, permissions: aggregatedPermissions };
  }

  public async checkEffectivePermissions(auth_user_uuid?: string, group_uuid?: string): Promise<{ [uuid: string]: { right: string; context: PermissionContext[] } }> {
    let groupUUIDs: string[] = [];
    if (!group_uuid && auth_user_uuid) {
      const user = await AuthUserTable.findByPk(auth_user_uuid);
      if (!user) return {};
      const groupMemberships = await UserGroupMemberTable.findAll({ where: { auth_user_uuid } });
      if (!groupMemberships.length) return {};
      groupUUIDs = groupMemberships.map(m => m.group_uuid);
    } else if (group_uuid && !auth_user_uuid) {
      const group = await UserGroupTable.findByPk(group_uuid);
      if (!group) return {};
      groupUUIDs = [group_uuid];
    } else {
      return {};
    }
    const permissionsMap: Record<string, { right: string; context: PermissionContext[] }> = {};
    const scopeUUIDs = await this.featureManager.getGroupsScopeList(groupUUIDs);
    const features = await FeatureTable.findAll({ where: { scope_uuid: scopeUUIDs } });
    for (const feature of features) {
      const featureUuid = feature.uuid;
      const featureCode = feature.code
      const [directPermissions, ancestorPermissions] = await Promise.all([
        PermissionTable.findAll({ where: { feature_uuid: featureUuid, group_uuid: groupUUIDs } }),
        this.checkAncestorEffectivePermissions(featureUuid, groupUUIDs),
      ]);
      const contextSet = new Set<string>();
      const context: PermissionContext[] = [];
      let rightConflict = false;
      let ancestorGrant = false;
      let grantOverride = false;
      let ancestorConflict = false;
      for (const permission of directPermissions) {
        const scopeFeature = await ScopeTable.findByPk(feature.scope_uuid);
        const permissionStatus = permission.is_deny ? "denied" : "granted";
        const contextKey = `${permission.scope_element_uuid}-${permissionStatus}`;

        if (!contextSet.has(contextKey)) {
          contextSet.add(contextKey);
          context.push({
            uuid: permission.scope_element_uuid,
            scope: scopeFeature ? scopeFeature.name : "",
            status: permissionStatus,
            type: "direct",
          });
        }
        const hierarchyUUIDs = await this.utilsOptions.scopeElementAncestor(permission.scope_element_uuid, scopeFeature ? scopeFeature.code : "");
        grantOverride = await Promise.all(
          ancestorPermissions.permissions.map(async (p) => {
            if (!p.is_deny && permission.is_deny) {
              return (await this.utilsOptions.scopeElementAncestor(
                p.scope_element_uuid,
                (await ScopeTable.findByPk(p.scope_uuid))?.code || ""
              )).includes(permission.scope_element_uuid) ||
                permission.scope_element_uuid === p.scope_element_uuid;
            }
            return false;
          })
        ).then(results => results.some(Boolean));
        rightConflict = ancestorPermissions.permissions.some(p => p.is_deny && !permission.is_deny && (hierarchyUUIDs.includes(p.scope_element_uuid) || p.scope_element_uuid === permission.scope_element_uuid))
          || directPermissions.some(p => p.is_deny && !permission.is_deny && (hierarchyUUIDs.includes(p.scope_element_uuid) || p.scope_element_uuid === permission.scope_element_uuid));
        ancestorGrant = ancestorPermissions.permissions.some(p => !p.is_deny && permission.is_deny && (hierarchyUUIDs.includes(p.scope_element_uuid) || p.scope_element_uuid === permission.scope_element_uuid))
      }
      const ancestorContext: PermissionContext[] = [];
      const denyExists = ancestorPermissions.permissions.some(p => p.is_deny);
      const grantExists = ancestorPermissions.permissions.some(p => !p.is_deny);
      for (const ancestorPermission of ancestorPermissions.permissions) {
        const scopeFeature = await ScopeTable.findByPk(ancestorPermission.scope_uuid);
        const permissionStatus = ancestorPermission.is_deny ? "denied" : "granted";
        const contextKey = `${ancestorPermission.scope_element_uuid}-${permissionStatus}`;
        const hierarchyUUIDs = await this.utilsOptions.scopeElementAncestor(ancestorPermission.scope_element_uuid, scopeFeature ? scopeFeature.code : "");
        ancestorConflict = ancestorPermissions.permissions.some(p => !ancestorPermission.is_deny && p.is_deny && (hierarchyUUIDs.includes(p.scope_element_uuid) || p.scope_element_uuid === ancestorPermission.scope_element_uuid));
        if (!contextSet.has(contextKey)) {
          contextSet.add(contextKey);
          ancestorContext.push({
            uuid: ancestorPermission.scope_element_uuid,
            scope: scopeFeature ? scopeFeature.name : "",
            status: permissionStatus,
            type: "ancestor",
            feature_code: ancestorPermission.feature_code,
          });
        }
      }
      let right = "noRight";
      if (rightConflict) {
        right = "rightConflict";
      } else {
        const hasDeny = directPermissions.some(p => p.is_deny);
        const hasGrant = directPermissions.some(p => !p.is_deny);
        if (hasDeny) {
          right = ancestorGrant && !grantOverride && !ancestorConflict ? "partialDeny" : "deny";
        } else if (hasGrant) {
          right = "grant";
        } else if (denyExists && grantExists) {
          right = ancestorConflict ? "deny" : "partialGrant";
        } else if (denyExists || ancestorConflict) {
          right = "deny";
        } else if (grantExists) {
          right = "grant";
        }
      }
      permissionsMap[featureCode] = {
        right,
        context: [...context, ...ancestorContext],
      };
    }
    return permissionsMap;
  }

  async checkAccess(userEmail: string, featureCode: string, elementUuid: string): Promise<"grant" | "deny"> {
    const user = await AuthUserTable.findOne({ where: { email: userEmail } })
    if (!user) return "deny";
    const feature = await FeatureTable.findOne({ where: { code: featureCode } });
    if (!feature) return "deny";
    const userGroupMemberships = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: user.uuid } });
    if (!userGroupMemberships.length) return "deny";
    const groupUUIDs = userGroupMemberships.map((group) => group.group_uuid);
    const scope = await ScopeTable.findOne({ where: { uuid: feature.scope_uuid } });
    if (!scope) return "deny";
    const directPermissions = await PermissionTable.findAll({
      where: {
        feature_uuid: feature.uuid,
        group_uuid: groupUUIDs,
      },
    });
    const hierarchyUUIDs = await this.utilsOptions.scopeElementAncestor(elementUuid, scope.code);
    for (const permission of directPermissions) {
      if (permission.is_deny) {
        if (permission.scope_element_uuid === elementUuid || hierarchyUUIDs.includes(permission.scope_element_uuid)) {
          return "deny";
        }
      }
    }
    const noElementPermission = !(directPermissions.some(permission =>
      !permission.scope_element_uuid ||
      permission.scope_element_uuid === elementUuid ||
      hierarchyUUIDs.includes(permission.scope_element_uuid)));
    const userGroups = await UserGroupTable.findAll({
      where: {
        uuid: groupUUIDs,
      },
    });
    if (!userGroups.some(group => hierarchyUUIDs.includes(group.scope_element_uuid))) {
      return "deny";
    }
    const parentPermission = await this.checkParentFeaturePermissions(feature.uuid, groupUUIDs, elementUuid, hierarchyUUIDs);
    if (parentPermission === "deny") return "deny";
    if (parentPermission === "grant") return "grant";
    if (parentPermission === null) {
      if (directPermissions.length === 0 || noElementPermission) return "deny";
    }
    return "grant";
  }

  async checkParentFeaturePermissions(featureUuid: string, groupUUIDs: string[], elementUuid: string, hierarchyUUIDs: string[], visited: Set<string> = new Set()): Promise<"grant" | "deny" | null> {
    if (visited.has(featureUuid)) return null;
    visited.add(featureUuid);

    const compositions = await FeatureCompositionTable.findAll({ where: { child_uuid: featureUuid } });
    let foundGrant = false;

    for (const composition of compositions) {
      const parentUuid = composition.parent_uuid;

      const parentPermissions = await PermissionTable.findAll({
        where: {
          feature_uuid: parentUuid,
          group_uuid: groupUUIDs,
        },
      });

      const feature = await FeatureTable.findOne({ where: { uuid: featureUuid } });
      if (!feature) return null;

      const scope = await ScopeTable.findOne({ where: { uuid: feature.scope_uuid } });
      if (!scope) return null;

      for (const permission of parentPermissions) {
        if (!permission.scope_element_uuid || permission.scope_element_uuid === elementUuid || hierarchyUUIDs.includes(permission.scope_element_uuid)) {
          if (permission.is_deny) {
            return "deny";
          }
          foundGrant = true;
        }
      }

      const ancestorPermission = await this.checkParentFeaturePermissions(parentUuid, groupUUIDs, elementUuid, hierarchyUUIDs, visited);
      if (ancestorPermission === "deny") return "deny";
      if (ancestorPermission === "grant") foundGrant = true;
    }

    return foundGrant ? "grant" : null;
  }

  async verifyGroupCollision(groupUUIDs: string[]): Promise<{ conflictType: string; permissions: any[] }[]> {
    const conflicts: { conflictType: string; permissions: any[] }[] = [];
    const permissions = await PermissionTable.findAll({ where: { group_uuid: groupUUIDs } });

    for (const permission of permissions) {
      const feature = await FeatureTable.findOne({ where: { uuid: permission.feature_uuid } });
      if (!feature) continue;

      const scope = await ScopeTable.findOne({ where: { uuid: feature.scope_uuid } });
      if (!scope) throw new Error("No scope found");

      const hierarchyUUIDs = await this.utilsOptions.scopeElementAncestor(permission.scope_element_uuid, scope.code);

      if (!permission.is_deny) {
        const ancestorResult = await this.checkParentFeaturePermissions(
          permission.feature_uuid,
          groupUUIDs,
          permission.scope_element_uuid,
          hierarchyUUIDs
        );

        if (ancestorResult === "deny") {
          conflicts.push({
            conflictType: "grant_overridden_by_deny",
            permissions: [permission],
          });
        }
      }
    }
    return conflicts;
  }

  async getSpecificElementDeny(userEmail: string, scopeCode: string): Promise<string[]> {
    const user = await AuthUserTable.findOne({ where: { email: userEmail } });
    if (!user) return [];
    const groupMemberships = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: user.uuid } });
    if (!groupMemberships.length) return [];
    const scope = await ScopeTable.findOne({ where: { code: scopeCode } });
    if (!scope) return [];
    const groupUUIDs = groupMemberships.map((group) => group.group_uuid);
    const permissions = await PermissionTable.findAll({
      where: {
        group_uuid: groupUUIDs,
        is_deny: true,
      },
    });
    if (!permissions.length) return [];
    const featuresScope = await FeatureTable.findAll({ where: { scope_uuid: scope.uuid } });
    const featureUUIDs = featuresScope.map((feature) => feature.uuid);
    const permissionsFiltered = permissions.filter((permission) => featureUUIDs.includes(permission.feature_uuid));
    if (permissionsFiltered.length > 0) {
      return permissionsFiltered.map((permission) => permission.scope_element_uuid);
    }
    return [];
  }

  async getPermissionsScopeElement(userEmail: string, scopeCode: string, scopeElementUuid: string): Promise<any[]> {
    const user = await AuthUserTable.findOne({ where: { email: userEmail } });
    const scope = await ScopeTable.findOne({ where: { code: scopeCode } });
    if (!user || !scope) return [];
    const allScopeUuids = [scope.uuid, ...(await this.featureManager.getAllChildScopes(scope.uuid))];
    const features = await FeatureTable.findAll({ where: { scope_uuid: allScopeUuids } });
    const featureMap = new Map(features.map(f => [f.uuid, f]));
    const groupMemberships = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: user.uuid }, raw: true });
    if (!groupMemberships.length) return [];
    const groupUUIDs = groupMemberships.map(g => g.group_uuid);
    const directPermissions = await PermissionTable.findAll({ where: { group_uuid: groupUUIDs }, raw: true });
    const collectedPermissions = new Map<string, Map<string, Set<"grant" | "deny">>>();
    const insertPermission = (featureUuid: string, elementUuid: string, status: "grant" | "deny") => {
      if (!collectedPermissions.has(featureUuid)) collectedPermissions.set(featureUuid, new Map());
      const entityPerms = collectedPermissions.get(featureUuid)!;
      if (!entityPerms.has(elementUuid)) entityPerms.set(elementUuid, new Set());
      entityPerms.get(elementUuid)!.add(status);
    };

    for (const permission of directPermissions) {
      const feature = featureMap.get(permission.feature_uuid);
      if (!feature) continue;
      insertPermission(permission.feature_uuid, permission.scope_element_uuid, permission.is_deny ? "deny" : "grant");
    }

    for (const feature of features) {
      const { permissions: inherited } = await this.checkAncestorEffectivePermissions(feature.uuid, groupUUIDs);

      for (const perm of inherited) {
        const elementScope = await ScopeTable.findByPk(perm.scope_uuid);
        if (!elementScope) continue;

        const permElementAncestors = await this.utilsOptions.scopeElementAncestor(perm.scope_element_uuid, elementScope.code);
        const elementAncestors = await this.utilsOptions.scopeElementAncestor(scopeElementUuid, scopeCode);

        const isSame = perm.scope_element_uuid === scopeElementUuid;
        const isDescendant = permElementAncestors.some(a => a === scopeElementUuid);
        const isAncestor = elementAncestors.some(a => a === perm.scope_element_uuid);

        if (isSame || isDescendant) {
          insertPermission(feature.uuid, perm.scope_element_uuid, perm.is_deny ? "deny" : "grant");
        } else if (isAncestor) {
          insertPermission(feature.uuid, scopeElementUuid, perm.is_deny ? "deny" : "grant");
        } else {
          continue;
        }
      }
    }
    const result: any[] = [];
    for (const [featureUuid, entityMap] of collectedPermissions.entries()) {
      const feature = featureMap.get(featureUuid);
      if (!feature) continue;
      const permissions: { uuid: string; status: "grant" | "deny" }[] = [];
      for (const [elemUuid, perms] of entityMap.entries()) {
        for (const status of perms) {
          permissions.push({ uuid: elemUuid, status });
        }
      }
      if (permissions.length)
        result.push({
          featureCode: feature.code,
          scopeCode: scope.code,
          permissions,
        });
    }
    return result;
  }
}
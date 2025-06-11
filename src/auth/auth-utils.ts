import { DbUser } from "../db/db-user";
import { DbUserGroupMember } from "../db/db-user-group-member";
import { DbPermission } from "../db/db-permission";
import { DbFeature } from "../db/db-feature";
import { DbUserGroup } from "../db/db-user-group";
import { DbFeatureComposition } from "../db/db-feature-composition";
import { IAMUser, IUtilsOptions, PermissionContext } from "../interfaces";
import { DbScope } from "../db/db-scope";
import { FeatureUtils } from "./feature-utils";


export class AuthUtils {

  private static instance: AuthUtils | undefined;
  private utilsOptions: IUtilsOptions;
  private featureUtils: FeatureUtils;

  private constructor(options: IUtilsOptions) {
    this.utilsOptions = options;
    this.featureUtils = FeatureUtils.getInstance();
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

    return await DbUser.findOne({ where: { email } }).then(async (user) => {
      if (!user) {
        await DbUser.create({
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

  public async getUserPermissions(userUuid?: string, userEmail?: string): Promise<any> {
    if (!userUuid && userEmail) {
      const user = await DbUser.findOne({ where: { email: userEmail } });
      if (!user) return {};
      userUuid = user.uuid;
    }
    if (!userUuid) {
      throw new Error("Must provide either userUuid or userEmail");
    }
    const groupMemberships = await DbUserGroupMember.findAll({
      where: { user_uuid: userUuid },
    });
    if (!groupMemberships.length) return {};
    const groupUUIDs = groupMemberships.map((group) => group.group_uuid);
    const permissions = await DbPermission.findAll({
      where: { group_uuid: groupUUIDs },
    });
    if (!permissions.length) return {};
    const featureUUIDs = permissions.map((permission) => permission.feature_uuid);
    const highestFeatures = await this.featureUtils.getHighestFeatures(featureUUIDs);
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
    permissions: DbPermission[],
  ): Promise<string[]> {
    const uniqueElements = new Set<string>();

    for (const permission of permissions) {
      if (!permission.scope_element_uuid || !permission.feature_uuid || permission.is_deny === true) continue;
      const feature = await DbFeature.findByPk(permission.feature_uuid);
      if (!feature) continue;
      const scope = await DbScope.findByPk(feature.scope_uuid);
      if (!scope) continue;
      const hierarchyUUIDs = await this.options.scopeElementAncestor(
        permission.scope_element_uuid,
        scope.code
      );
      const otherPermissions = permissions.filter(p => p !== permission);
      const isUnique = !otherPermissions.some(p =>
        hierarchyUUIDs.includes(p.scope_element_uuid) && p.scope_element_uuid !== permission.scope_element_uuid
      );

      if (isUnique) uniqueElements.add(permission.scope_element_uuid);
    }
    return Array.from(uniqueElements);
  }

  public async checkAncestorEffectivePermissions(
    featureUuid: string,
    groupUUIDs: string[],
  ): Promise<{ inherited: boolean; permissions: { scope_element_uuid: string; scope_uuid: string; feature_code: string; is_deny: boolean }[] }> {
    const aggregatedPermissions: Array<{ scope_element_uuid: string; scope_uuid: string; feature_code: string; is_deny: boolean }> = [];
    const compositions = await DbFeatureComposition.findAll({ where: { child_uuid: featureUuid } });
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
        DbPermission.findAll({ where: { feature_uuid: c.parent_uuid, group_uuid: groupUUIDs } }),
        DbFeature.findByPk(c.parent_uuid),
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

  public async checkEffectivePermissions(user_uuid?: string, group_uuid?: string): Promise<{ [uuid: string]: { right: string; context: PermissionContext[] } }> {
    let groupUUIDs: string[] = [];
    if (!group_uuid && user_uuid) {
      const user = await DbUser.findByPk(user_uuid);
      if (!user) return {};
      const groupMemberships = await DbUserGroupMember.findAll({ where: { user_uuid } });
      if (!groupMemberships.length) return {};
      groupUUIDs = groupMemberships.map(m => m.group_uuid);
    } else if (group_uuid && !user_uuid) {
      const group = await DbUserGroup.findByPk(group_uuid);
      if (!group) return {};
      groupUUIDs = [group_uuid];
    } else {
      return {};
    }
    const permissionsMap: Record<string, { right: string; context: PermissionContext[] }> = {};
    const scopeUUIDs = await this.featureUtils.getGroupsScopeList(groupUUIDs);
    const features = await DbFeature.findAll({ where: { scope_uuid: scopeUUIDs } });
    for (const feature of features) {
      const featureUuid = feature.uuid;
      const featureCode = feature.code
      const [directPermissions, ancestorPermissions] = await Promise.all([
        DbPermission.findAll({ where: { feature_uuid: featureUuid, group_uuid: groupUUIDs } }),
        this.checkAncestorEffectivePermissions(featureUuid, groupUUIDs),
      ]);
      const contextSet = new Set<string>();
      const context: PermissionContext[] = [];
      let rightConflict = false;
      let ancestorGrant = false;
      let grantOverride = false;
      let ancestorConflict = false;
      for (const permission of directPermissions) {
        const scopeFeature = await DbScope.findByPk(feature.scope_uuid);
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
        grantOverride = ancestorPermissions.permissions.some((p) => {
          return !p.is_deny && permission.is_deny && p.scope_element_uuid === permission.scope_element_uuid;
        });
        rightConflict = ancestorPermissions.permissions.some(p => p.is_deny && !permission.is_deny && (hierarchyUUIDs.includes(p.scope_element_uuid)))
          || directPermissions.some(p => (p.is_deny !== permission.is_deny) && (hierarchyUUIDs.includes(p.scope_element_uuid)));
        ancestorGrant = ancestorPermissions.permissions.some(p => !p.is_deny && permission.is_deny && (hierarchyUUIDs.includes(p.scope_element_uuid)))
      }
      const ancestorContext: PermissionContext[] = [];
      const denyExists = ancestorPermissions.permissions.some(p => p.is_deny);
      const grantExists = ancestorPermissions.permissions.some(p => !p.is_deny);
      for (const ancestorPermission of ancestorPermissions.permissions) {
        const scopeAncestor = await DbScope.findByPk(ancestorPermission.scope_uuid);
        const permissionStatus = ancestorPermission.is_deny ? "denied" : "granted";
        const contextKey = `${ancestorPermission.scope_element_uuid}-${permissionStatus}`;
        const hierarchyUUIDs = await this.utilsOptions.scopeElementAncestor(ancestorPermission.scope_element_uuid, scopeAncestor ? scopeAncestor.code : "");
        ancestorConflict = ancestorPermissions.permissions.some(p => !ancestorPermission.is_deny && p.is_deny && (hierarchyUUIDs.includes(p.scope_element_uuid)));
        if (!contextSet.has(contextKey)) {
          contextSet.add(contextKey);
          ancestorContext.push({
            uuid: ancestorPermission.scope_element_uuid,
            scope: scopeAncestor ? scopeAncestor.name : "",
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
        } else {
          right = denyExists || ancestorConflict ? "deny" : grantExists ? "grant" : "noRight";
        }
      }
      permissionsMap[featureCode] = {
        right,
        context: [...context, ...ancestorContext],
      };
    }
    return permissionsMap;
  }

  async checkAccess(reqUser: IAMUser, featureCode: string, elementUuid: string): Promise<"grant" | "deny"> {
    const user = await DbUser.findOne({ where: { email: reqUser.impersonateUser || reqUser.email } })
    if (!user) return "deny";
    const feature = await DbFeature.findOne({ where: { code: featureCode } });
    if (!feature) return "deny";
    const userGroupMemberships = await DbUserGroupMember.findAll({ where: { user_uuid: user.uuid } });
    if (!userGroupMemberships.length) return "deny";
    const groupUUIDs = userGroupMemberships.map((group) => group.group_uuid);
    const scope = await DbScope.findOne({ where: { uuid: feature.scope_uuid } });
    if (!scope) return "deny";
    const directPermissions = await DbPermission.findAll({
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
    const userGroups = await DbUserGroup.findAll({
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

    const compositions = await DbFeatureComposition.findAll({ where: { child_uuid: featureUuid } });
    let foundGrant = false;

    for (const composition of compositions) {
      const parentUuid = composition.parent_uuid;

      const parentPermissions = await DbPermission.findAll({
        where: {
          feature_uuid: parentUuid,
          group_uuid: groupUUIDs,
        },
      });

      const feature = await DbFeature.findOne({ where: { uuid: featureUuid } });
      if (!feature) return null;

      const scope = await DbScope.findOne({ where: { uuid: feature.scope_uuid } });
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

  async verifyGroupCollision(groupUUIDs: string[]): Promise<{ conflictType: string; permissions: DbPermission[] }[]> {
    const conflicts: { conflictType: string; permissions: any[] }[] = [];
    const permissions = await DbPermission.findAll({ where: { group_uuid: groupUUIDs } });

    for (const permission of permissions) {
      const feature = await DbFeature.findOne({ where: { uuid: permission.feature_uuid } });
      if (!feature) continue;

      const scope = await DbScope.findOne({ where: { uuid: feature.scope_uuid } });
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

  async getSpecificElementDeny(userEmail: string, featureCode: string): Promise<string[]> {
    const user = await DbUser.findOne({ where: { email: userEmail } });
    if (!user) return [];
    const groupMemberships = await DbUserGroupMember.findAll({ where: { user_uuid: user.uuid } });
    if (!groupMemberships.length) return [];
    const groupUUIDs = groupMemberships.map((group) => group.group_uuid);
    const feature = await DbFeature.findOne({ where: { code: featureCode } });
    if (!feature) return [];

    const permissions = await DbPermission.findAll({
      where: {
        group_uuid: groupUUIDs,
        is_deny: true,
      },
    });
    const directDenials = permissions
      .filter((permission) => feature.uuid === permission.feature_uuid)
      .map((permission) => permission.scope_element_uuid);
    const inheritedPermissions = await this.checkAncestorEffectivePermissions(feature.uuid, groupUUIDs);
    const inheritedDenials = inheritedPermissions.permissions
      .filter((permission) => permission.is_deny)
      .map((permission) => permission.scope_element_uuid);
    const allDeniedElements = new Set([...directDenials, ...inheritedDenials]);
    return Array.from(allDeniedElements);
  }

  async getPermissionsScopeElement(userEmail: string, scopeCode: string, scopeElementUuid: string): Promise<any[]> {
    const user = await DbUser.findOne({ where: { email: userEmail } });
    const scope = await DbScope.findOne({ where: { code: scopeCode } });
    if (!user || !scope) return [];
    const allScopeUuids = [scope.uuid, ...(await this.featureUtils.getAllChildScopes(scope.uuid))];
    const features = await DbFeature.findAll({ where: { scope_uuid: allScopeUuids } });
    const featureMap = new Map(features.map(f => [f.uuid, f]));
    const groupMemberships = await DbUserGroupMember.findAll({ where: { user_uuid: user.uuid }, raw: true });
    if (!groupMemberships.length) return [];
    const groupUUIDs = groupMemberships.map(g => g.group_uuid);
    const directPermissions = await DbPermission.findAll({ where: { group_uuid: groupUUIDs }, raw: true });
    const collectedPermissions = new Map<string, Map<string, Set<"grant" | "deny">>>();
    const insertPermission = (featureUuid: string, elementUuid: string, status: "grant" | "deny") => {
      if (!collectedPermissions.has(featureUuid)) collectedPermissions.set(featureUuid, new Map());
      const entityPerms = collectedPermissions.get(featureUuid)!;
      if (!entityPerms.has(elementUuid)) entityPerms.set(elementUuid, new Set());
      entityPerms.get(elementUuid)!.add(status);
    };
    directPermissions.forEach(permission =>
      insertPermission(
        permission.feature_uuid,
        permission.scope_element_uuid,
        permission.is_deny ? "deny" : "grant"
      )
    );
    for (const feature of features) {
      const { permissions: inherited } = await this.checkAncestorEffectivePermissions(feature.uuid, groupUUIDs);

      for (const perm of inherited) {
        const elementScope = await DbScope.findByPk(perm.scope_uuid);
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
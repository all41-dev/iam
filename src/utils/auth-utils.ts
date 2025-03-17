import { AuthUserTable } from "../db/auth-user-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { PermissionTable } from "../db/permission-table";
import { FeatureTable } from "../db/feature-table";
import { UserGroupTable } from "../db/user-group-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { IUtilsOptions } from "../interfaces";
import { ScopeTable } from "../db/scope-table";
/* import { ScopeTable } from "../db/scope-table";
import { FeatureManager } from "../feature-manager"; */

export class AuthUtils {
  private static instance: AuthUtils;
  /* private featureManager = FeatureManager.getInstance(); */
  private utilsOptions: IUtilsOptions;

  private constructor(options?: IUtilsOptions) {
    this.utilsOptions = options ?? {};
  }

  public get options() {
    return this.utilsOptions;
  }

  public static getInstance(options?: IUtilsOptions) {
    if (!AuthUtils.instance) {
      AuthUtils.instance = new AuthUtils(options);
    }
    return AuthUtils.instance;
  }

  async checkUser(profile: any, provider: string): Promise<{ user: any; error?: string }> {
    const email = profile.emails[0].value;
    const displayName = profile.displayName;
    let firstName = profile.name?.givenName || displayName.split(' ')[0];
    let lastName = profile.name?.familyName || displayName.split(' ')[1];
    if (!firstName) firstName = displayName;
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
        const permissions = (await this.checkUserPermissions(user.uuid)).permissions;
        if (!permissions) {
          return { user: false, error: 'permission' };
        }
        return {
          user: {
            ...user.dataValues,
            permissions,
          },
        };
      }
    });
  }

  async checkUserPermissions(auth_user_uuid: string): Promise<{ permissions: { [uuid: string]: boolean } | undefined; error?: string; }> {
    if (!auth_user_uuid) {
      return { permissions: undefined, error: "User not found" };
    }

    const groupMemberships = await UserGroupMemberTable.findAll({ where: { auth_user_uuid } });

    const permissionsMap: { [featureUuid: string]: boolean[] } = {};

    for (const membership of groupMemberships) {
      const group_uuid = membership.dataValues.group_uuid;
      const features = await FeatureTable.findAll({
        include: {
          model: PermissionTable,
          where: { group_uuid },
        },
      });

      for (const feature of features) {
        if (feature.uuid) {
          const permission = feature.permissions?.find(
            (p: PermissionTable) => p.feature_uuid === feature.uuid
          );

          if (permission) {
            if (!permissionsMap[feature.uuid]) {
              permissionsMap[feature.uuid] = [];
            }
            permissionsMap[feature.uuid].push(permission.is_deny);
          }
        }
      }
    }

    const groupUUIDs = groupMemberships.map(membership => membership.dataValues.group_uuid);
    const permissions: { [uuid: string]: boolean } = {};

    for (const [featureUuid, decisions] of Object.entries(permissionsMap)) {
      const ancestorDeny = await this.checkAncestorPermissions(featureUuid, groupUUIDs);
      permissions[featureUuid] = ancestorDeny || decisions.includes(true);
    }

    return { permissions };
  }

  public async checkAncestorPermissions(
    featureUuid: string,
    groupUUIDs: string[],
    visited: Set<string> = new Set()
  ): Promise<boolean> {
    if (visited.has(featureUuid)) return false;

    visited.add(featureUuid);

    const compositions = await FeatureCompositionTable.findAll({
      where: { child_uuid: featureUuid },
    });

    if (compositions.length === 0) return false;

    for (const composition of compositions) {
      const parentUuid = composition.parent_uuid;

      const currentPermissions = await PermissionTable.findAll({
        where: {
          feature_uuid: parentUuid,
          group_uuid: groupUUIDs,
        },
      });

      for (const permission of currentPermissions) {
        if (permission.is_deny) return true;
      }

      const result = await this.checkAncestorPermissions(parentUuid, groupUUIDs, visited);
      if (result) return true;
    }

    return false;
  }

  async checkAccess(userEmail: string, featureCode: string, elementUuid: string): Promise<"grant" | "deny"> {
    const user = await AuthUserTable.findOne({ where: { email: userEmail } })
    if (!user) return "deny";

    const feature = await FeatureTable.findOne({ where: { code: featureCode } });
    if (!feature) return "deny";

    const userGroupMemberships = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: user.uuid } });
    if (!userGroupMemberships.length) return "deny";

    const groupUUIDs = userGroupMemberships.map((group) => group.group_uuid);

    const directPermissions = await PermissionTable.findAll({
      where: {
        feature_uuid: feature.uuid,
        group_uuid: groupUUIDs,
      },
    });
    const scope = await ScopeTable.findOne({ where: { uuid: feature.scope_uuid } });
    if (!scope) return "deny";

    for (const permission of directPermissions) {
      const scopeHierarchy = this.utilsOptions.scopeHierarchy ? await this.utilsOptions.scopeHierarchy(elementUuid, scope.code) : {};
      const hierarchyUUIDs = Object.values(scopeHierarchy);

      if (permission.is_deny) {
        if (!permission.feature_scope_uuid || permission.feature_scope_uuid === elementUuid || hierarchyUUIDs.includes(permission.feature_scope_uuid)) {
          return "deny";
        }
      }
    }

    const userGroups = await UserGroupTable.findAll({
      where: {
        uuid: groupUUIDs,
      },
    });

    if (this.utilsOptions.scopeHierarchy) {
      const hierarchy = await this.utilsOptions.scopeHierarchy(elementUuid, scope.code);
      const hierarchyUUIDs = Object.values(hierarchy);

      if (!userGroups.some(group => hierarchyUUIDs.includes(group.scope_element_uuid))) {
        return "deny";
      }
    }


    const parentPermission = await this.checkParentFeaturePermissions(feature.uuid, groupUUIDs, elementUuid);
    if (parentPermission === "deny") return "deny";
    if (parentPermission === "grant") return "grant";
    if (parentPermission === null) {
      if (directPermissions.length === 0) return "deny";
    }

    return "grant";
  }

  async checkParentFeaturePermissions(featureUuid: string, groupUUIDs: string[], elementUuid: string, visited: Set<string> = new Set()): Promise<"grant" | "deny" | null> {
    if (visited.has(featureUuid)) return null;

    visited.add(featureUuid);

    /*     const allScopes = await ScopeTable.findAll({ where: { group_uuid: groupUUIDs } });
        const highestScopeUuid = await this.featureManager.getHighestScope(allScopes);
     */

    const compositions = await FeatureCompositionTable.findAll({ where: { child_uuid: featureUuid } });
    if (!compositions.length) return null;

    let foundGrant = false;

    for (const composition of compositions) {
      const parentUuid = composition.parent_uuid;

      /*       const parentFeatureScope = await FeatureTable.findOne({ where: { feature_uuid: parentUuid } });
            if (parentFeatureScope && parentFeatureScope.scope_uuid === highestScopeUuid) {
              continue;
            } */

      const parentPermissions = await PermissionTable.findAll({
        where: {
          feature_uuid: parentUuid,
          group_uuid: groupUUIDs,
        },
      });

      const feature = await FeatureTable.findOne({ where: { code: parentUuid } });
      if (!feature) return null;

      const scope = await ScopeTable.findOne({ where: { uuid: feature.scope_uuid } });
      if (!scope) return null;

      for (const permission of parentPermissions) {
        const scopeHierarchy = this.utilsOptions.scopeHierarchy ? await this.utilsOptions.scopeHierarchy(elementUuid, scope.code) : {};
        const hierarchyUUIDs = Object.values(scopeHierarchy);

        if (permission.is_deny) {
          if (!permission.feature_scope_uuid || permission.feature_scope_uuid === elementUuid || hierarchyUUIDs.includes(permission.feature_scope_uuid)) {
            return "deny";
          }
        }

        if (!permission.is_deny) {
          if (!permission.feature_scope_uuid || permission.feature_scope_uuid === elementUuid) {
            foundGrant = true;
          }
        }
      }

      const ancestorPermission = await this.checkParentFeaturePermissions(parentUuid, groupUUIDs, elementUuid, visited);
      if (ancestorPermission === "deny") return "deny";
      if (ancestorPermission === "grant") foundGrant = true;
    }

    return foundGrant ? "grant" : null;
  }
}
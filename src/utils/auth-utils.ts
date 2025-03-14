import { AuthUserTable } from "../db/auth-user-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { PermissionTable } from "../db/permission-table";
import { FeatureTable } from "../db/feature-table";
import { UserGroupTable } from "../db/user-group-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";

export class AuthUtils {
  private static instance: AuthUtils;

  static getInstance() {
    if (!AuthUtils.instance) {
      AuthUtils.instance = new AuthUtils();
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
          firstName,
          lastName,
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

  async checkPermission(auth_user_uuid: string, feature_uuid: string): Promise<{ isDeny: boolean; feature_scope_uuid?: string; scope_element_uuid?: string; error?: string }> {
    if (!auth_user_uuid) {
      return { isDeny: true, error: "User not found" };
    }
    const groupMemberships = await UserGroupMemberTable.findAll({
      where: { auth_user_uuid },
    });

    if (groupMemberships.length === 0) {
      return { isDeny: true, error: "User not in any group" };
    }

    const groupUUIDs = groupMemberships.map((membership) => membership.group_uuid);
    const permissions = await PermissionTable.findAll({
      where: { group_uuid: groupUUIDs, feature_uuid },
    });

    if (permissions.length === 0) {
      return { isDeny: true, error: "No permissions found" };
    }

    const ancestorDeny = await this.checkAncestorPermissions(feature_uuid, groupUUIDs);
    if (ancestorDeny) {
      return { isDeny: true, error: "Permission denied by ancestor" };
    }

    for (const permission of permissions) {
      if (permission.is_deny) {
        const result: { isDeny: boolean; feature_scope_uuid?: string; scope_element_uuid?: string; error?: string } = { isDeny: true, error: "Permission denied" };

        if (permission.feature_scope_uuid) {
          result.feature_scope_uuid = permission.feature_scope_uuid;
        }
        const group = await UserGroupTable.findOne({
          where: { uuid: permission.group_uuid },
        });

        if (group?.scope_element_uuid) {
          result.scope_element_uuid = group.scope_element_uuid;
        }

        return result;
      }
    }
    return { isDeny: false };
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

    const userGroups = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: user.uuid } });
    if (!userGroups.length) return "deny";

    const groupUUIDs = userGroups.map((group) => group.group_uuid);

    const directPermissions = await PermissionTable.findAll({
      where: {
        feature_uuid: feature.uuid,
        group_uuid: groupUUIDs,
      },
    });

    for (const permission of directPermissions) {
      if (permission.is_deny) {
        if (!permission.feature_scope_uuid || permission.feature_scope_uuid === elementUuid) {
          return "deny";
        }
      }
    }

    const parentDeny = await this.checkParentFeaturePermissions(feature.uuid, groupUUIDs, elementUuid);
    if (parentDeny) return "deny";

    return "grant";
  }

  async checkParentFeaturePermissions(featureUuid: string, groupUUIDs: string[], elementUuid: string, visited: Set<string> = new Set()): Promise<boolean> {
    if (visited.has(featureUuid)) return false;

    visited.add(featureUuid);

    const compositions = await FeatureCompositionTable.findAll({ where: { child_uuid: featureUuid } });
    if (!compositions.length) return false;

    for (const composition of compositions) {
      const parentUuid = composition.parent_uuid;

      const parentPermissions = await PermissionTable.findAll({
        where: {
          feature_uuid: parentUuid,
          group_uuid: groupUUIDs,
        },
      });

      for (const permission of parentPermissions) {
        if (permission.is_deny) {
          if (!permission.feature_scope_uuid || permission.feature_scope_uuid === elementUuid) {
            return true;
          }
        }
      }

      const ancestorDeny = await this.checkParentFeaturePermissions(parentUuid, groupUUIDs, elementUuid, visited);
      if (ancestorDeny) return true;
    }
    return false;
  }
}
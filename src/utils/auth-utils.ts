import { AuthUserTable } from "../db/auth-user-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { PermissionTable } from "../db/permission-table";
import { FeatureTable } from "../db/feature-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";

class AuthUtils {
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

  async checkPermission(auth_user_uuid: string, feature_uuid: string): Promise<{ isDeny: boolean; error?: string }> {
    try {
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

      if (permissions.some((permission) => permission.is_deny)) {
        return { isDeny: true, error: "Permission denied" };
      }

      return { isDeny: false };
    } catch (error) {
      throw new Error("Failed to check permissions");
    }
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

  async checkAncestorPermissions(featureUuid: string, groupUUIDs: string[]): Promise<boolean> {
    const composition = await FeatureCompositionTable.findOne({
      where: { child_uuid: featureUuid },
    });

    if (!composition) return false;
    const parentUuid = composition.parent_uuid;

    const currentPermissions = await PermissionTable.findAll({
      where: {
        feature_uuid: parentUuid,
        group_uuid: groupUUIDs,
      },
    });

    for (const permission of currentPermissions) {
      if (permission.is_deny) {
        return true;
      }
    }

    return await this.checkAncestorPermissions(parentUuid, groupUUIDs);
  }
}

export default AuthUtils.getInstance();

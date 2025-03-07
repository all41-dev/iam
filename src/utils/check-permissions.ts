import { UserTable } from "../db/users-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { PermissionTable } from "../db/permission-table";
import { FeatureTable } from "../db/feature-table";

export async function checkPermissions(
  email: string,
  feature_uuid: string
): Promise<{ isDeny: boolean; error?: string }> {
  try {
    const user = await UserTable.findOne({ where: { email } });
    if (!user) {
      return { isDeny: true, error: "User not found" };
    }

    const groupMemberships = await UserGroupMemberTable.findAll({
      where: { user_uuid: user.uuid },
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

    if (permissions.some((permission) => permission.is_deny)) {
      return { isDeny: true, error: "Permission denied" };
    }

    return { isDeny: false };
  } catch (error) {
    throw new Error("Failed to check permissions");
  }
}



export async function checkUserPermissions(user_uuid: string): Promise<{
  featurePermissions: { [uuid: string]: boolean };
  error?: string;
}> {
  if (!user_uuid) {
    return { featurePermissions: {}, error: "User not found" };
  }

  const groupMemberships = await UserGroupMemberTable.findAll({ where: { user_uuid } });

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

  const featurePermissions: { [uuid: string]: boolean } = {};
  for (const [featureUuid, decisions] of Object.entries(permissionsMap)) {
    featurePermissions[featureUuid] = decisions.includes(true) ? false : true;
  }

  return { featurePermissions };
}

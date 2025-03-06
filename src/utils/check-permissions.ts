import { UserTable } from "../db/users-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { PermissionTable } from "../db/permission-table";
import { UserGroupTable } from "../db/user-group-table";
import { FeatureTable } from "../db/feature-table";

export async function checkPermissions(
  email: string,
  feature_uuid: string
): Promise<{ hasAccess: boolean; error?: string }> {
  try {
    const user = await UserTable.findOne({ where: { email } });
    if (!user) {
      return { hasAccess: false, error: "User not found" };
    }

    const groupMemberships = await UserGroupMemberTable.findAll({
      where: { user_uuid: user.uuid },
    });

    if (groupMemberships.length === 0) {
      return { hasAccess: false, error: "User not in any group" };
    }

    const groupUUIDs = groupMemberships.map((membership) => membership.group_uuid);
    const permissions = await PermissionTable.findAll({
      where: { group_uuid: groupUUIDs, feature_uuid },
    });

    if (permissions.length === 0) {
      return { hasAccess: false, error: "No permissions found" };
    }

    if (permissions.some((permission) => permission.is_deny)) {
      return { hasAccess: false, error: "Permission denied" };
    }

    return { hasAccess: true };
  } catch (error) {
    throw new Error("Failed to check permissions");
  }
}



export async function checkUserPermissions(email: string): Promise<{
  featurePermissions: { [uuid: string]: boolean };
  error?: string;
}> {
  const user = await UserTable.findOne({ where: { email: email } });

  if (!user) {
    return { featurePermissions: {}, error: "User not found" };
  }

  const groups = await UserGroupTable.findAll({
    include: {
      model: UserGroupMemberTable,
      where: { user_uuid: user.uuid },
    },
  });

  const featurePermissions: { [uuid: string]: boolean } = {};

  for (const group of groups) {
    const features = await FeatureTable.findAll({
      include: {
        model: PermissionTable,
        where: { group_uuid: group.uuid },
      },
    });

    for (const feature of features) {
      const permission = feature.permissions?.find(
        (p: PermissionTable) => p.feature_uuid === feature.uuid
      );
      if (feature.uuid) {
        if (permission && permission.is_deny) {
          featurePermissions[feature.uuid] = false;
        } else {
          featurePermissions[feature.uuid] = true;
        }
      }
    }
  }

  return { featurePermissions };
}

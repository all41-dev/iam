import { FeatureCompositionTable } from "../db/feature-composition-table";
import { PermissionTable } from "../db/permission-table";

export async function checkAncestorPermissions(featureUuid: string, groupUUIDs: string[]): Promise<boolean> {
  const composition = await FeatureCompositionTable.findOne({
    where: { child_uuid: featureUuid },
  });

  if (!composition) return false
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

  if (await checkAncestorPermissions(parentUuid, groupUUIDs)) {
    return true;
  }
  return false;
}



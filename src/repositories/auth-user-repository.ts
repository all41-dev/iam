import { RepositorySequelize } from '@all41-dev/server.types';
import { AuthUserTable } from '../db/auth-user-table';
import { UserGroupTable } from "../db/user-group-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { v4 as uuidv4 } from 'uuid';
import { AuthUtils } from '../auth/auth-utils';
import { PermissionTable } from '../db/permission-table';
import { FeatureTable } from '../db/feature-table';


export class RepositoryAuthUser extends RepositorySequelize<AuthUserTable> {
  private authUtils: AuthUtils;

  constructor() {
    super(AuthUserTable);
    this.authUtils = AuthUtils.getInstance();
  }

  public async init() {
    return this;
  }

  public async addGroups(userUuid: string, groupUuids: string[]) {
    const user = await this.getByKey(userUuid);
    if (!user) {
      throw new Error(`User with id ${userUuid} not found`);
    }
    const groups = await UserGroupTable.findAll({
      where: { uuid: groupUuids },
    });
    if (groups.length !== groupUuids.length) {
      throw new Error(`Some users not found`);
    }
    const userGroupMembers = groups.map(group => ({
      uuid: uuidv4(),
      auth_user_uuid: user.uuid,
      group_uuid: group.uuid,
    }));
    await UserGroupMemberTable.bulkCreate(userGroupMembers);
  }

  public async removeGroups(userUuid: string, groupUuids: string[]) {
    const user = await this.getByKey(userUuid);
    if (!user) {
      throw new Error(`User with id ${userUuid} not found`);
    }
    const groups = await UserGroupTable.findAll({
      where: { uuid: groupUuids },
    });
    if (groups.length !== groupUuids.length) {
      throw new Error(`Some groups not found`);
    }
    const groupUuidsToRemove = groups.map(group => group.uuid);
    await UserGroupMemberTable.destroy({
      where: {
        auth_user_uuid: user.uuid,
        group_uuid: groupUuidsToRemove,
      }
    });
  }
  public async updateGroups(userUuid: string, groupUuids: string[]) {
    const user = await this.getByKey(userUuid);
    if (!user) {
      throw new Error(`User with id ${userUuid} not found`);
    }

    const currentUserGroups = await UserGroupMemberTable.findAll({
      where: { auth_user_uuid: user.uuid },
      attributes: ['group_uuid'],
    });

    const currentGroupUuids = currentUserGroups.map(group => group.group_uuid);

    const groupsToAdd = groupUuids.filter(uuid => !currentGroupUuids.includes(uuid));
    const groupsToRemove = currentGroupUuids.filter(uuid => !groupUuids.includes(uuid));
    if (groupsToAdd.length > 0) await this.addGroups(userUuid, groupsToAdd);
    if (groupsToRemove.length > 0) await this.removeGroups(userUuid, groupsToRemove);
    const conflicts = await this.authUtils.verifyGroupCollision(groupUuids);
    if (conflicts.length > 0) return conflicts;
  }

  public async getUserEffectivePermissions(userUuid: string): Promise<any> {
    return await this.authUtils.checkEffectivePermissions(userUuid);
  }

  public async getUserPermissionInfo(userEmail: string): Promise<any> {
    const user = await AuthUserTable.findOne({ where: { email: userEmail } });
    if (!user) {
      throw new Error(`User with email "${userEmail}" not found`);
    }
    const permissions = await this.authUtils.checkEffectivePermissions(user.uuid);
    const allowedRights = new Set(["grant", "partialGrant", "partialDeny"]);
    const filtered: Record<string, any> = {};
    for (const [feature, details] of Object.entries(permissions)) {
      if (allowedRights.has(details.right)) {
        filtered[feature] = details;
      }
    }
    return filtered;
  }

  public async checkFeaturePermissions(userUuid: string, featureUuid: string, elementUuid: string) {
    const user = await AuthUserTable.findByPk(userUuid)
    const feature = await FeatureTable.findByPk(featureUuid)
    if (!user) throw new Error(`User with uuid: ${userUuid} not found`);
    if (!feature) throw new Error(`Feature with uuid: ${featureUuid} not found`);
    return await this.authUtils.checkAccess(user.email, feature.code, elementUuid);
  }

  public async getPermissions(userUuid: string): Promise<PermissionTable[]> {
    const user = await AuthUserTable.findByPk(userUuid);
    if (!user) {
      throw new Error(`
        User with uuid: ${userUuid} not found`);
    }
    const groups = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: userUuid } });
    if (!groups.length) {
      return []
    }
    const groupUUIDs = groups.map((group) => group.group_uuid);
    const permissions = await PermissionTable.findAll({
      where: { group_uuid: groupUUIDs },
    });
    if (!permissions.length) {
      return []
    }
    return permissions;
  }

  public async getUserGroups(userUuid: string): Promise<UserGroupTable[] | null> {
    const user = await this.getByKey(userUuid);
    if (!user) {
      throw new Error(`
        User with uuid: ${userUuid} not found`);
    }
    const groupsMember = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: user.uuid } });
    if (!groupsMember.length) {
      return null;
    }
    const groupUUIDs = groupsMember.map((group) => group.group_uuid);
    const groups = await UserGroupTable.findAll({
      where: { uuid: groupUUIDs },
    });
    return groups;
  }

  public async copyUserGroups(userUuid: string, userToCopyUuid: string) {
    const user = await this.getByKey(userUuid);
    if (!user) {
      throw new Error(`User with id ${userUuid} not found`);
    }
    const groups = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: userUuid } });
    if (!groups.length) {
      throw new Error(`No Groups for User with id ${userToCopyUuid}`);
    }
    const groupsToCopy = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: userToCopyUuid } });
    if (!groupsToCopy.length) {
      throw new Error(`No Groups for User with id ${userToCopyUuid}`);
    }
    const currentGroupUuids = groups.map(group => group.group_uuid);
    const groupUuidsToCopy = groupsToCopy.map(group => group.group_uuid);

    const groupsToAdd = groupUuidsToCopy.filter(uuid => !currentGroupUuids.includes(uuid));
    if (groupsToAdd.length > 0) await this.addGroups(userUuid, groupsToAdd);
  }
  public async getUserInfo(userEmail: string): Promise<{ groups: UserGroupTable[], permissions: PermissionTable[] } | null> {
    const user = await AuthUserTable.findOne({ where: { email: userEmail } });
    if (!user) {
      throw new Error(`User with email "${userEmail}" not found`);
    }
    const groupsMember = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: user.uuid } });
    if (!groupsMember.length) {
      return {
        ...user.get({ plain: true }),
        groups: [],
        permissions: [],
      };
    }
    const groupUUIDs = groupsMember.map((group) => group.group_uuid);
    const [groups, permissions] = await Promise.all([
      UserGroupTable.findAll({ where: { uuid: groupUUIDs } }),
      PermissionTable.findAll({ where: { group_uuid: groupUUIDs } }),
    ]);
    return {
      ...user.get({ plain: true }),
      groups,
      permissions,
    };
  }
}
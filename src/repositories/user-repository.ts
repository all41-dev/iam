import { RepositorySequelize } from '@all41-dev/server.types';
import { DbUser } from '../db/db-user';
import { DbUserGroup } from "../db/db-user-group";
import { DbUserGroupMember } from "../db/db-user-group-member";
import { v4 as uuidv4 } from 'uuid';
import { AuthUtils } from '../auth/auth-utils';
import { DbPermission } from '../db/db-permission';
import { DbFeature } from '../db/db-feature';


export class RepositoryUser extends RepositorySequelize<DbUser> {
  private authUtils: AuthUtils;

  constructor() {
    super(DbUser);
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
    const groups = await DbUserGroup.findAll({
      where: { uuid: groupUuids },
    });
    if (groups.length !== groupUuids.length) {
      throw new Error(`Some users not found`);
    }
    const userGroupMembers = groups.map(group => ({
      uuid: uuidv4(),
      user_uuid: user.uuid,
      group_uuid: group.uuid,
    }));
    await DbUserGroupMember.bulkCreate(userGroupMembers);
  }

  public async removeGroups(userUuid: string, groupUuids: string[]) {
    const user = await this.getByKey(userUuid);
    if (!user) {
      throw new Error(`User with id ${userUuid} not found`);
    }
    const groups = await DbUserGroup.findAll({
      where: { uuid: groupUuids },
    });
    if (groups.length !== groupUuids.length) {
      throw new Error(`Some groups not found`);
    }
    const groupUuidsToRemove = groups.map(group => group.uuid);
    await DbUserGroupMember.destroy({
      where: {
        user_uuid: user.uuid,
        group_uuid: groupUuidsToRemove,
      }
    });
  }
  public async updateGroups(userUuid: string, groupUuids: string[]) {
    const user = await this.getByKey(userUuid);
    if (!user) {
      throw new Error(`User with id ${userUuid} not found`);
    }

    const currentUserGroups = await DbUserGroupMember.findAll({
      where: { user_uuid: user.uuid },
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
    const user = await DbUser.findOne({ where: { email: userEmail } });
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
    const user = await DbUser.findByPk(userUuid)
    const feature = await DbFeature.findByPk(featureUuid)
    if (!user) throw new Error(`User with uuid: ${userUuid} not found`);
    if (!feature) throw new Error(`Feature with uuid: ${featureUuid} not found`);
    return await this.authUtils.checkAccess(user, feature.code, elementUuid);
  }

  public async getPermissions(userUuid: string): Promise<DbPermission[]> {
    const user = await DbUser.findByPk(userUuid);
    if (!user) {
      throw new Error(`
        User with uuid: ${userUuid} not found`);
    }
    const groups = await DbUserGroupMember.findAll({ where: { user_uuid: userUuid } });
    if (!groups.length) {
      return []
    }
    const groupUUIDs = groups.map((group) => group.group_uuid);
    const permissions = await DbPermission.findAll({
      where: { group_uuid: groupUUIDs },
    });
    if (!permissions.length) {
      return []
    }
    return permissions;
  }

  public async getUserGroups(userUuid: string): Promise<DbUserGroup[] | null> {
    const user = await this.getByKey(userUuid);
    if (!user) {
      throw new Error(`
        User with uuid: ${userUuid} not found`);
    }
    const groupsMember = await DbUserGroupMember.findAll({ where: { user_uuid: user.uuid } });
    if (!groupsMember.length) {
      return null;
    }
    const groupUUIDs = groupsMember.map((group) => group.group_uuid);
    const groups = await DbUserGroup.findAll({
      where: { uuid: groupUUIDs },
    });
    return groups;
  }

  public async copyUserGroups(userUuid: string, userToCopyUuid: string) {
    const user = await this.getByKey(userUuid);
    if (!user) {
      throw new Error(`User with id ${userUuid} not found`);
    }
    const groups = await DbUserGroupMember.findAll({ where: { user_uuid: userUuid } });
    const groupsToCopy = await DbUserGroupMember.findAll({ where: { user_uuid: userToCopyUuid } });
    if (!groupsToCopy.length) {
      throw new Error(`No Groups for User with id ${userToCopyUuid}`);
    }
    const currentGroupUuids = groups.map(group => group.group_uuid);
    const groupUuidsToCopy = groupsToCopy.map(group => group.group_uuid);

    const groupsToAdd = groupUuidsToCopy.filter(uuid => !currentGroupUuids.includes(uuid));
    if (groupsToAdd.length > 0) await this.addGroups(userUuid, groupsToAdd);
  }
  public async getUserInfo(userEmail: string): Promise<{ groups: DbUserGroup[], permissions: DbPermission[] } | null> {
    const user = await DbUser.findOne({ where: { email: userEmail } });
    if (!user) {
      throw new Error(`User with email "${userEmail}" not found`);
    }
    const groupsMember = await DbUserGroupMember.findAll({ where: { user_uuid: user.uuid } });
    if (!groupsMember.length) {
      return {
        ...user.get({ plain: true }),
        groups: [],
        permissions: [],
      };
    }
    const groupUUIDs = groupsMember.map((group) => group.group_uuid);
    const [groups, permissions] = await Promise.all([
      DbUserGroup.findAll({ where: { uuid: groupUUIDs } }),
      DbPermission.findAll({ where: { group_uuid: groupUUIDs } }),
    ]);
    return {
      ...user.get({ plain: true }),
      groups,
      permissions,
    };
  }
  public async getElementPermission(userEmail: string, scopeCode: string, elementUuid: string) {
    return await this.authUtils.getPermissionsScopeElement(userEmail, scopeCode, elementUuid);
  }
}
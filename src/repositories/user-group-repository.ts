import { RepositorySequelize } from "@all41-dev/server.types";
import { UserGroupTable } from "../db/user-group-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { UserTable } from "../db/user-table";
import { v4 as uuidv4 } from 'uuid';
import { PermissionTable } from "../db/permission-table";
import { FeatureTable } from "../db/feature-table";
import { AuthUtils } from "../auth/auth-utils";
import { Transaction } from "sequelize";

export class RepositoryUserGroup extends RepositorySequelize<UserGroupTable> {
  private authUtils: AuthUtils;

  constructor() {
    super(UserGroupTable);
    this.authUtils = AuthUtils.getInstance();
  }

  public async init() {
    return this;
  }

  public async addUsers(userUuids: string[], groupUuid: string) {
    const group = await this.getByKey(groupUuid);
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    const users = await UserTable.findAll({
      where: { uuid: userUuids },
    });
    if (users.length !== userUuids.length) {
      throw new Error(`Some users not found`);
    }
    const userGroupMembers = users.map(user => ({
      uuid: uuidv4(),
      user_uuid: user.uuid,
      group_uuid: group.uuid,
    }));
    await UserGroupMemberTable.bulkCreate(userGroupMembers);
  }


  public async removeUsers(userUuids: string[], groupUuid: string) {
    const group = await this.getByKey(groupUuid);
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    const users = await UserTable.findAll({
      where: { uuid: userUuids },
    });
    if (users.length !== userUuids.length) {
      throw new Error(`Some users not found`);
    }
    const userUuidsToRemove = users.map(user => user.uuid);
    await UserGroupMemberTable.destroy({
      where: {
        user_uuid: userUuidsToRemove,
        group_uuid: group.uuid,
      },
    });
  }

  public async getUsers(groupUuid: string): Promise<UserTable[]> {
    const group = await this.getByKey(groupUuid);
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    const userGroupMembers = await UserGroupMemberTable.findAll({
      where: { group_uuid: group.uuid },
    });
    const userUuids = userGroupMembers.map(member => member.user_uuid);
    const users = await UserTable.findAll({
      where: { uuid: userUuids },
    });
    return users;
  }

  public async getPermissions(groupUuid: string): Promise<PermissionTable[]> {
    const group = await this.getByKey(groupUuid);
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    const permissions = await PermissionTable.findAll({
      where: { group_uuid: group.uuid },
      include: [
        {
          model: FeatureTable,
          as: 'feature',
        },
      ],
    });
    return permissions;
  }

  public async getEffectivePermissions(groupUuid: string): Promise<any> {
    return await this.authUtils.checkEffectivePermissions(undefined, groupUuid);
  }

  public async copyGroup(groupUuid: string, newGroupName: string) {
    const group = await this.getByKey(groupUuid);
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    const permission = await PermissionTable.findAll({ where: { group_uuid: group.uuid } });
    const sequelizeInstance = UserGroupTable.sequelize;
    if (!sequelizeInstance) {
      throw new Error('Database connection unavailable.');
    }
    const transaction: Transaction = await sequelizeInstance.transaction();
    try {
      const newGroup = await UserGroupTable.create(
        {
          uuid: uuidv4(),
          name: newGroupName,
          scope_uuid: group.scope_uuid,
          scope_element_uuid: group.scope_element_uuid,
        },
        { transaction }
      );
      const newGroupPermissions = permission.map((p) => ({
        uuid: uuidv4(),
        is_deny: p.is_deny,
        scope_element_uuid: p.scope_element_uuid,
        group_uuid: newGroup.uuid,
        feature_uuid: p.feature_uuid,
      }));

      await PermissionTable.bulkCreate(newGroupPermissions, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Failed to copy group: ${error}`);
    }
  }
}

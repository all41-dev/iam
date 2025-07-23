import { RepositorySequelize } from "@all41-dev/server.types";
import { DbUserGroup } from "../db/db-user-group";
import { DbUserGroupMember } from "../db/db-user-group-member";
import { DbUser } from "../db/db-user";
import { v4 as uuidv4 } from 'uuid';
import { DbPermission } from "../db/db-permission";
import { DbFeature } from "../db/db-feature";
import { AuthUtils } from "../auth/auth-utils";
import { Transaction } from "sequelize";

export class RepositoryUserGroup extends RepositorySequelize<DbUserGroup> {
  private authUtils: AuthUtils;

  constructor() {
    super(DbUserGroup);
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
    const users = await DbUser.findAll({
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
    await DbUserGroupMember.bulkCreate(userGroupMembers);
  }


  public async removeUsers(userUuids: string[], groupUuid: string) {
    const group = await this.getByKey(groupUuid);
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    const users = await DbUser.findAll({
      where: { uuid: userUuids },
    });
    if (users.length !== userUuids.length) {
      throw new Error(`Some users not found`);
    }
    const userUuidsToRemove = users.map(user => user.uuid);
    await DbUserGroupMember.destroy({
      where: {
        user_uuid: userUuidsToRemove,
        group_uuid: group.uuid,
      },
    });
  }

  public async getUsers(groupUuid: string): Promise<DbUser[]> {
    const group = await this.getByKey(groupUuid);
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    const userGroupMembers = await DbUserGroupMember.findAll({
      where: { group_uuid: group.uuid },
    });
    const userUuids = userGroupMembers.map(member => member.user_uuid);
    const users = await DbUser.findAll({
      where: { uuid: userUuids },
    });
    return users;
  }

  public async getPermissions(groupUuid: string): Promise<DbPermission[]> {
    const group = await this.getByKey(groupUuid);
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    const permissions = await DbPermission.findAll({
      where: { group_uuid: group.uuid },
      include: [
        {
          model: DbFeature,
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
    const permission = await DbPermission.findAll({ where: { group_uuid: group.uuid } });
    const sequelizeInstance = DbUserGroup.sequelize;
    if (!sequelizeInstance) {
      throw new Error('Database connection unavailable.');
    }
    const transaction: Transaction = await sequelizeInstance.transaction();
    try {
      const newGroup = await DbUserGroup.create(
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

      await DbPermission.bulkCreate(newGroupPermissions, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Failed to copy group: ${error}`);
    }
  }
}

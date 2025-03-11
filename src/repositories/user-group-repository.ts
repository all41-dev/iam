import { RepositorySequelize } from "@all41-dev/server.types";
import { UserGroupTable } from "../db/user-group-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { AuthUserTable } from "../db/auth-user-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";
import { v4 as uuidv4 } from 'uuid';

export class RepositoryUserGroup extends RepositorySequelize<UserGroupTable> {
  constructor(repository: SequelizeNativeRepository<UserGroupTable>) {
    super(UserGroupTable, repository);
  }

  public async init() {
    return this;
  }

  public async addUsers(userUuids: string[], groupUuid: string) {
    const group = await this.getByKey(groupUuid);
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    const users = await AuthUserTable.findAll({
      where: { uuid: userUuids },
    });
    if (users.length !== userUuids.length) {
      throw new Error(`Some users not found`);
    }
    const userGroupMembers = users.map(user => ({
      uuid: uuidv4(),
      auth_user_uuid: user.uuid,
      group_uuid: group.uuid,
    }));
    await UserGroupMemberTable.bulkCreate(userGroupMembers);
  }


  public async removeUsers(userUuids: string[], groupUuid: string) {
    const group = await this.getByKey(groupUuid);
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    const users = await AuthUserTable.findAll({
      where: { uuid: userUuids },
    });
    if (users.length !== userUuids.length) {
      throw new Error(`Some users not found`);
    }
    const userUuidsToRemove = users.map(user => user.uuid);
    await UserGroupMemberTable.destroy({
      where: {
        auth_user_uuid: userUuidsToRemove,
        group_uuid: group.uuid,
      },
    });
  }
}

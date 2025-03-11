import { RepositorySequelize } from "@all41-dev/server.types";
import { UserGroupTable } from "../db/user-group-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { AuthUserTable } from "../db/auth-user-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";

export class RepositoryUserGroup extends RepositorySequelize<UserGroupTable> {
  constructor(repository: SequelizeNativeRepository<UserGroupTable>) {
    super(UserGroupTable, repository);
  }

  public async init() {
    return this;
  }

  public async addUser(userUuid: string, groupUuid: string) {
    const user = await AuthUserTable.findOne({ where: { uuid: userUuid } });
    const group = await this.getByKey(groupUuid);
    if (!user) {
      throw new Error(`User with id ${userUuid} not found`);
    }
    await UserGroupMemberTable.create({
      auth_user_uuid: user.uuid,
      group_uuid: group.uuid,
    });
  }

  public async removeUser(userUuid: string, groupUuid: string) {
    const user = await AuthUserTable.findOne({ where: { uuid: userUuid } });
    const group = await this.getByKey(groupUuid);
    if (!user) {
      throw new Error(`User with id ${userUuid} not found`);
    }
    await UserGroupMemberTable.destroy({
      where: {
        auth_user_uuid: user.uuid,
        group_uuid: group.uuid,
      },
    });
  }
}

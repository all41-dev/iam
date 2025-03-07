import { RepositorySequelize } from "@all41-dev/server";
import { UserGroupTable } from "../db/user-group-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { AuthUserTable } from "../db/auth-user-table";

export class RepositoryUserGroup extends RepositorySequelize<UserGroupTable> {
  constructor(options?: { dbName?: string }) {
    super(UserGroupTable, options?.dbName);
  }

  public async init() {
    return this;
  }

  public async addUser(userId: string, groupId: string) {
    const user = await AuthUserTable.findOne({ where: { id: userId } });
    const group = await this.getByKey(groupId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    await UserGroupMemberTable.create({
      user_uuid: user.uuid,
      group_uuid: group.uuid,
    });
  }

  public async removeUser(userId: string, groupId: string) {
    const user = await AuthUserTable.findOne({ where: { id: userId } });
    const group = await this.getByKey(groupId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    await UserGroupMemberTable.destroy({
      where: {
        user_uuid: user.uuid,
        group_uuid: group.uuid,
      },
    });
  }
}

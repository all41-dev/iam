import { RepositorySequelize } from '@all41-dev/server';
import { AuthUserTable } from '../db/auth-user-table';
import { UserGroupTable } from "../db/user-group-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";



export class UserRepository extends RepositorySequelize<AuthUserTable> {
  constructor(options?: { dbName: string }) {
    super(AuthUserTable, options?.dbName);
  }

  public async init() {
    return this;
  }

  public async addGroup(userId: string, groupId: string) {
    const user = await this.getByKey(userId);
    const group = await UserGroupTable.findOne({ where: { uuid: groupId } });
    if (!group) {
      throw new Error(`Group with id ${groupId} not found`);
    }
    await UserGroupMemberTable.create({
      user_uuid: user.uuid,
      group_uuid: group.uuid
    });
  }

  public async removeGroup(userId: string, groupId: string) {
    const user = await this.getByKey(userId);
    const group = await UserGroupTable.findOne({ where: { uuid: groupId } });
    if (!group) {
      throw new Error(`Group with id ${groupId} not found`);
    }
    await UserGroupMemberTable.destroy({
      where: {
        user_uuid: user.uuid,
        group_uuid: group.uuid
      }
    });
  }

}
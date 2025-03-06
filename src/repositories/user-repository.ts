import { RepositorySequelize } from '@all41-dev/server';
import { UserTable } from '../db/users-table';
import { UserGroupTable } from "../db/user-group-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";



export class UserRepository extends RepositorySequelize<UserTable> {
  constructor(options?: { dbName: string }) {
    super(UserTable, options?.dbName);
  }

  public async init() {
    return this;
  }

  //TODO: remove the allowUser and denyUser methods
  public async allowUser(userId: string) {
    const user = await this.getByKey(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const result = await user.set('allowed', true).save();
    return result;
  }

  public async denyUser(userId: string) {
    const user = await this.getByKey(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const result = await user.set('allowed', false).save();
    return result;
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
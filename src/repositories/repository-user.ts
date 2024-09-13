import { RepositorySequelize } from "@all41-dev/server";
import { User } from "../db/models/user";
import { UserGroupMember } from "../db/models/user-group-member";
import { RepositoryUserGroup } from "./repository-user-group";
import { UserGroup } from "../db/models/user-group";

export class RepositoryUser extends RepositorySequelize<User> {
  constructor(options?: { dbName?: string }) {
    super(User, options?.dbName);
  }

  public async init() {
    return this;
  }

  public async addGroup(userId: string, groupId: string) {
    const user = await this.getByKey(userId);
    const group = await UserGroup.findOne({ where: {uuid: groupId}});
    if (!group) {
      throw new Error(`Group with id ${groupId} not found`);
    }
    await UserGroupMember.create({
      user_uuid: user.uuid,
      group_uuid: group.uuid
    });
  }

  public async removeGroup(userId: string, groupId: string) {
    const user = await this.getByKey(userId);
    const group = await UserGroup.findOne({ where: {uuid: groupId}});
    if (!group) {
      throw new Error(`Group with id ${groupId} not found`);
    }
    await UserGroupMember.destroy({
      where: {
        user_uuid: user.uuid,
        group_uuid: group.uuid
      }
    });
  }

}
import { RepositorySequelize } from '@all41-dev/server.types';
import { AuthUserTable } from '../db/auth-user-table';
import { UserGroupTable } from "../db/user-group-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";



export class RepositoryAuthUser extends RepositorySequelize<AuthUserTable> {
  constructor(repository: SequelizeNativeRepository<AuthUserTable>) {
    super(AuthUserTable, repository);
  }

  public async init() {
    return this;
  }

  public async addGroup(userUuid: string, groupUuid: string) {
    const user = await this.getByKey(userUuid);
    const group = await UserGroupTable.findOne({ where: { uuid: groupUuid } });
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    await UserGroupMemberTable.create({
      auth_user_uuid: user.uuid,
      group_uuid: group.uuid
    });
  }

  public async removeGroup(userUuid: string, groupUuid: string) {
    const user = await this.getByKey(userUuid);
    const group = await UserGroupTable.findOne({ where: { uuid: groupUuid } });
    if (!group) {
      throw new Error(`Group with id ${groupUuid} not found`);
    }
    await UserGroupMemberTable.destroy({
      where: {
        auth_user_uuid: user.uuid,
        group_uuid: group.uuid
      }
    });
  }

}
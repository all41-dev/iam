import { RepositorySequelize } from '@all41-dev/server.types';
import { AuthUserTable } from '../db/auth-user-table';
import { UserGroupTable } from "../db/user-group-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";
import { v4 as uuidv4 } from 'uuid';
import { AuthUtils } from '../auth/auth-utils';


export class RepositoryAuthUser extends RepositorySequelize<AuthUserTable> {
  private authUtils: AuthUtils;

  constructor(repository: SequelizeNativeRepository<AuthUserTable>) {
    super(AuthUserTable, repository);
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
    const groups = await UserGroupTable.findAll({
      where: { uuid: groupUuids },
    });
    if (groups.length !== groupUuids.length) {
      throw new Error(`Some users not found`);
    }
    const userGroupMembers = groups.map(group => ({
      uuid: uuidv4(),
      auth_user_uuid: user.uuid,
      group_uuid: group.uuid,
    }));
    await UserGroupMemberTable.bulkCreate(userGroupMembers);
  }

  public async removeGroups(userUuid: string, groupUuids: string[]) {
    const user = await this.getByKey(userUuid);
    if (!user) {
      throw new Error(`User with id ${userUuid} not found`);
    }
    const groups = await UserGroupTable.findAll({
      where: { uuid: groupUuids },
    });
    if (groups.length !== groupUuids.length) {
      throw new Error(`Some groups not found`);
    }
    const groupUuidsToRemove = groups.map(group => group.uuid);
    await UserGroupMemberTable.destroy({
      where: {
        auth_user_uuid: user.uuid,
        group_uuid: groupUuidsToRemove,
      }
    });
  }
  public async checkUserPermissions(userUuid: string) {
    return await this.authUtils.checkUserPermissions(userUuid)
  }

  public async checkFeaturePermissions(userUuid: string, featureCode: string, elementUuid: string) {
    return await this.authUtils.checkAccess(userUuid, featureCode, elementUuid)
  }
}
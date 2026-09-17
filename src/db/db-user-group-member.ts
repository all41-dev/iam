import { AllowNull, BelongsTo, Column, DataType, Default, Model, PrimaryKey } from 'sequelize-typescript';
import { DbUser } from './db-user';
import { DbUserGroup } from './db-user-group';
import { Table } from '@all41-dev/server.types';

@Table({ tableName: 'iam_user_group_member', timestamps: true })
export class DbUserGroupMember extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare user_uuid: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare group_uuid: string;

  @BelongsTo(() => DbUser, 'user_uuid')
  declare user: DbUser;

  @BelongsTo(() => DbUserGroup, 'group_uuid')
  declare group: DbUserGroup;

  public get pkName() {
    return 'uuid' as keyof DbUserGroupMember;
  }
}

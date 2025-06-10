import { AllowNull, BelongsTo, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";
import { DbUser } from "./db-user";
import { DbUserGroup } from "./db-user-group";

@Table({ tableName: "iam_user_group_member", timestamps: false })
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

  public get pkName() { return 'uuid' as keyof DbUserGroupMember; }

}
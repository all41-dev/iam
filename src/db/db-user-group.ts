import { AllowNull, BelongsTo, BelongsToMany, Column, DataType, Default, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript";
import { DbScope } from "./db-scope";
import { DbPermission } from "./db-permission";
import { DbUser } from "./db-user";
import { DbUserGroupMember } from "./db-user-group-member";

@Table({ tableName: "iam_user_group" })
export class DbUserGroup extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare name: string;

  @BelongsTo(() => DbScope, 'scope_uuid')
  declare scope: DbScope;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare scope_uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare scope_element_uuid: string;

  @HasMany(() => DbPermission, 'group_uuid')
  declare permissions: DbPermission[];

  @BelongsToMany(() => DbUser, () => DbUserGroupMember, 'group_uuid', 'user_uuid')
  declare users: DbUser[];

  public get pkName() { return 'uuid' as keyof DbUserGroup; }
}
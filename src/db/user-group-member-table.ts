import { AllowNull, BelongsTo, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";
import { AuthUserTable } from "./auth-user-table";
import { UserGroupTable } from "./user-group-table";

@Table({ tableName: "user_group_member", timestamps: false })
export class UserGroupMemberTable extends Model {

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

  @BelongsTo(() => AuthUserTable, 'user_uuid')
  declare user: AuthUserTable;

  @BelongsTo(() => UserGroupTable, 'group_uuid')
  declare group: UserGroupTable;

  public get pkName() { return 'uuid' as keyof UserGroupMemberTable; }

}
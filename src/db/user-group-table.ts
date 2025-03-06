import { AllowNull, BelongsTo, BelongsToMany, Column, DataType, Default, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript";
import { ScopeTable } from "./scope-table";
import { PermissionTable } from "./permission-table";
import { UserTable } from "./users-table";
import { UserGroupMemberTable } from "./user-group-member-table";

@Table({tableName: "user_group"})
export class UserGroupTable extends Model {
 
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare name: string;

  @BelongsTo(() => ScopeTable, 'scope_uuid')
  declare scope: ScopeTable;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare scope_uuid: string;

  @AllowNull(true)
  @Column(DataType.STRING(100))
  declare scope_element_uuid: string;

  @HasMany(() => PermissionTable, 'group_uuid')
  declare permissions: PermissionTable[];

  @BelongsToMany(() => UserTable, () => UserGroupMemberTable, 'group_uuid', 'user_uuid')
  declare users: UserTable[];

  public get pkName() { return 'uuid' as keyof UserGroupTable; }
}
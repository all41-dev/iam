import { AllowNull, BelongsTo, BelongsToMany, Column, DataType, Default, HasMany, HasOne, Model, PrimaryKey, Table } from "sequelize-typescript";
import { Scope } from "./scope";
import { Permission } from "./permission";
import { User } from "./user";
import { UserGroupMember } from "./user-group-member";

@Table({tableName: "user_group"})
export class UserGroup extends Model {
 
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare name: string;

  @BelongsTo(() => Scope, 'scope_uuid')
  declare scope: Scope;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare scope_uuid: string;

  @AllowNull(true)
  @Column(DataType.STRING(100))
  declare scope_element_uuid: string;

  @HasMany(() => Permission, 'group_uuid')
  declare permissions: Permission[];

  @BelongsToMany(() => User, () => UserGroupMember, 'group_uuid', 'user_uuid')
  declare users: User[];

  public get pkName() { return 'uuid' as keyof UserGroup; }
}
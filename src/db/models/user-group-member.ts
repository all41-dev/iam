import { AllowNull, BelongsTo, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";
import { User } from "./user";
import { UserGroup } from "./user-group";

@Table({tableName: "user_group_member", timestamps: false})
export class UserGroupMember extends Model {
  
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

  @BelongsTo(() => User, 'user_uuid')
  declare user: User;

  @BelongsTo(() => UserGroup, 'group_uuid')
  declare group: UserGroup;

  public get pkName() { return 'uuid' as keyof UserGroupMember; }

}
import { AllowNull, BelongsToMany, Column, DataType, Default, Model, PrimaryKey, Table, Unique } from "sequelize-typescript";
import { UserGroup } from "./user-group";
import { UserGroupMember } from "./user-group-member";

@Table({tableName: "user", timestamps: false})
export class User extends Model {
  
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(100))
  declare email: string;

  @BelongsToMany(() => UserGroup, () => UserGroupMember, 'user_uuid', 'group_uuid')
  declare groups: UserGroup[];

  public get pkName() { return 'uuid' as keyof User; }

}
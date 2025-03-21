import { AllowNull, BelongsTo, Table } from "sequelize-typescript";
import { Column, DataType, Default, Model, PrimaryKey } from "sequelize-typescript";
import { UserGroupTable } from "./user-group-table";
import { FeatureTable } from "./feature-table";

@Table({ tableName: "permission" })
export class PermissionTable extends Model {

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare is_deny: boolean;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare scope_element_uuid: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare group_uuid: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare feature_uuid: string;

  @BelongsTo(() => UserGroupTable, 'group_uuid')
  declare group: UserGroupTable;

  @BelongsTo(() => FeatureTable, 'feature_uuid')
  declare feature: FeatureTable;

  public get pkName() { return 'uuid' as keyof PermissionTable; }

}
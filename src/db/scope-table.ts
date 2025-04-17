import { AllowNull, BelongsTo, Column, DataType, Default, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript";
import { UserGroupTable } from "./user-group-table";
import { FeatureTable } from "./feature-table";

@Table({ tableName: "iam_scope", timestamps: false })
export class ScopeTable extends Model {

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare name: string;

  @AllowNull(false)
  @Column(DataType.STRING(36))
  declare code: string;

  @AllowNull(true)
  @Column(DataType.UUID)
  declare parent_uuid?: string;

  @BelongsTo(() => ScopeTable, 'parent_uuid')
  declare parent?: ScopeTable;

  @HasMany(() => ScopeTable, 'parent_uuid')
  declare children?: ScopeTable[];

  @HasMany(() => UserGroupTable, 'scope_uuid')
  declare user_groups: UserGroupTable[];

  @HasMany(() => FeatureTable, 'scope_uuid')
  declare features: FeatureTable[];

  public get pkName() { return 'uuid' as keyof ScopeTable; }

}
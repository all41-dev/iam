import { BelongsTo, BelongsToMany, HasMany, Table } from "sequelize-typescript";
import { Column, DataType, Default, Model, PrimaryKey, AllowNull } from "sequelize-typescript";
import { ScopeTable } from "./scope-table";
import { FeatureCompositionTable } from "./feature-composition-table";
import { PermissionTable } from "./permission-table";

@Table({ tableName: "feature" })
export class FeatureTable extends Model {

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare name: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare scope_uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING(36))
  declare code: string;

  @HasMany(() => PermissionTable, 'feature_uuid')
  declare permissions?: PermissionTable[];

  @BelongsTo(() => ScopeTable, 'scope_uuid')
  declare scope?: ScopeTable;

  @BelongsToMany(() => FeatureTable, () => FeatureCompositionTable, 'parent_uuid', 'child_uuid')
  declare children?: FeatureTable[];

  @BelongsToMany(() => FeatureTable, () => FeatureCompositionTable, 'child_uuid', 'parent_uuid')
  declare parents?: FeatureTable[];

  public get pkName() { return 'uuid' as keyof FeatureTable; }

}

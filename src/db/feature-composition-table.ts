import { AllowNull, BelongsTo, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";
import { FeatureTable } from "./feature-table";

@Table({tableName: "feature_composition", timestamps: false})
export class FeatureCompositionTable extends Model {
  
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid?: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare child_uuid: string;

  @AllowNull(true)
  @Column(DataType.UUID)
  declare parent_uuid: string;

  @BelongsTo(() => FeatureTable, 'child_uuid')
  declare child?: FeatureTable;

  @BelongsTo(() => FeatureTable, 'parent_uuid')
  declare parent?: FeatureTable;

  public get pkName() { return 'uuid' as keyof FeatureCompositionTable; }

}
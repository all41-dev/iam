import { AllowNull, BelongsTo, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";
import { Feature } from "./feature";

@Table({tableName: "feature_composition", timestamps: false})
export class FeatureComposition extends Model {
  
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare uuid?: string;

    @AllowNull(false)
    @Column(DataType.UUID)
    declare child_uuid: string;

    @AllowNull(false)
    @Column(DataType.UUID)
    declare parent_uuid: string;

    @BelongsTo(() => Feature, 'child_uuid')
    declare child?: Feature;

    @BelongsTo(() => Feature, 'parent_uuid')
    declare parent?: Feature;

    public get pkName() { return 'uuid' as keyof FeatureComposition; }

}
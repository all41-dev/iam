import { AllowNull, BelongsTo, Column, DataType, Default, Model, PrimaryKey } from 'sequelize-typescript';
import { DbFeature } from './db-feature';
import { Table } from '@all41-dev/server.types';

@Table({ tableName: 'iam_feature_composition', timestamps: false })
export class DbFeatureComposition extends Model {
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

  @BelongsTo(() => DbFeature, 'child_uuid')
  declare child?: DbFeature;

  @BelongsTo(() => DbFeature, 'parent_uuid')
  declare parent?: DbFeature;

  public get pkName() {
    return 'uuid' as keyof DbFeatureComposition;
  }
}

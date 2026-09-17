import { BelongsTo, BelongsToMany, HasMany } from 'sequelize-typescript';
import { Column, DataType, Default, Model, PrimaryKey, AllowNull } from 'sequelize-typescript';
import { DbScope } from './db-scope';
import { DbFeatureComposition } from './db-feature-composition';
import { DbPermission } from './db-permission';
import { Table } from '@all41-dev/server.types';

@Table({ tableName: 'iam_feature' })
export class DbFeature extends Model {
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

  @HasMany(() => DbPermission, 'feature_uuid')
  declare permissions?: DbPermission[];

  @BelongsTo(() => DbScope, 'scope_uuid')
  declare scope?: DbScope;

  @BelongsToMany(() => DbFeature, () => DbFeatureComposition, 'parent_uuid', 'child_uuid')
  declare children?: DbFeature[];

  @BelongsToMany(() => DbFeature, () => DbFeatureComposition, 'child_uuid', 'parent_uuid')
  declare parents?: DbFeature[];

  public get pkName() {
    return 'uuid' as keyof DbFeature;
  }
}

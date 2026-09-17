import { AllowNull, BelongsTo } from 'sequelize-typescript';
import { Column, DataType, Default, Model, PrimaryKey } from 'sequelize-typescript';
import { DbUserGroup } from './db-user-group';
import { DbFeature } from './db-feature';
import { Table } from '@all41-dev/server.types';

@Table({ tableName: 'iam_permission' })
export class DbPermission extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Default(false)
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

  @BelongsTo(() => DbUserGroup, 'group_uuid')
  declare group: DbUserGroup;

  @BelongsTo(() => DbFeature, 'feature_uuid')
  declare feature: DbFeature;

  public get pkName() {
    return 'uuid' as keyof DbPermission;
  }
}

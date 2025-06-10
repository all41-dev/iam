import { AllowNull, BelongsTo, Column, DataType, Default, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript";
import { DbUserGroup } from "./db-user-group";
import { DbFeature } from "./db-feature";

@Table({ tableName: "iam_scope", timestamps: false })
export class DbScope extends Model {
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

  @BelongsTo(() => DbScope, 'parent_uuid')
  declare parent?: DbScope;

  @HasMany(() => DbScope, 'parent_uuid')
  declare children?: DbScope[];

  @HasMany(() => DbUserGroup, 'scope_uuid')
  declare user_groups: DbUserGroup[];

  @HasMany(() => DbFeature, 'scope_uuid')
  declare features: DbFeature[];

  public get pkName() { return 'uuid' as keyof DbScope; }

}
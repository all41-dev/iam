import { BelongsTo, BelongsToMany, HasMany, Table } from "sequelize-typescript";
import { Column, DataType, Default, Model, PrimaryKey } from "sequelize-typescript";
import { Scope } from "./scope";
import { FeatureComposition } from "./feature_composition";
import { Permission } from "./permission";

@Table({ tableName: "feature" })
export class Feature extends Model {

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid?: string;

  @Column(DataType.STRING(100))
  declare name?: string;

  @Column(DataType.UUID)
  declare scope_uuid?: string;

  @HasMany(() => Permission, 'feature_uuid')
  declare permissions?: Permission[];

  @BelongsTo(() => Scope, 'scope_uuid')
  declare scope?: Scope;

  @BelongsToMany(() => Feature, () => FeatureComposition, 'parent_uuid', 'child_uuid')
  declare children?: Feature[];

  @BelongsToMany(() => Feature, () => FeatureComposition, 'child_uuid', 'parent_uuid')
  declare parents?: Feature[];

  public get pkName() { return 'uuid' as keyof Feature; }

}

import { AllowNull, BelongsTo, Column, DataType, Default, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript";
import { UserGroup } from "./user-group";
import { Feature } from "./feature";

@Table({tableName: "scope", timestamps: false})
export class Scope extends Model {
  
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare uuid: string;

    @AllowNull(false)
    @Column(DataType.STRING(100))
    declare name: string;

    @AllowNull(true)
    @Column(DataType.UUID)
    declare parent_uuid: string;

    @BelongsTo(() => Scope, 'parent_uuid')
    declare parent: Scope;

    @HasMany(() => Scope, 'parent_uuid')
    declare children: Scope[];

    @HasMany(() => UserGroup, 'scope_uuid')
    declare user_groups: UserGroup[];

    @HasMany(() => Feature, 'scope_uuid')
    declare features: Feature[];

    public get pkName() { return 'uuid' as keyof Scope; }

}
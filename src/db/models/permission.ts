import { AllowNull, BelongsTo, Table } from "sequelize-typescript";
import { Column, DataType, Default, Model, PrimaryKey } from "sequelize-typescript";
import { UserGroup } from "./user-group";
import { Feature } from "./feature";

@Table({tableName: "permission" })
export class Permission extends Model {
  
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare uuid: string;

    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    declare is_deny: boolean;

    @AllowNull(true)
    @Column(DataType.UUID)
    declare feature_scope_uuid: string;

    @AllowNull(false)
    @Column(DataType.UUID)
    declare group_uuid: string;

    @AllowNull(false)
    @Column(DataType.UUID)
    declare feature_uuid: string;

    @BelongsTo(() => UserGroup, 'group_uuid')
    declare group: UserGroup;

    @BelongsTo(() => Feature, 'feature_uuid')
    declare feature: Feature;

    public get pkName() { return 'uuid' as keyof Permission; }

}
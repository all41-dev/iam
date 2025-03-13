import {
  Model,
  PrimaryKey,
  Default,
  DataType,
  Column,
  AllowNull,
  Table
} from "sequelize-typescript";

@Table({ tableName: "refresh_expiry" })
export class RefreshExpiryTable extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare expiry_time: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare customer_uuid: string;
}

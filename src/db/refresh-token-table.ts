import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { UserTable } from "./users-table";

@Table({
  modelName: "refreshToken",
  tableName: "refreshToken",
  timestamps: true,
})
export class RefreshTokenTable extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  @ForeignKey(() => UserTable)
  declare userUuid: string;

  @BelongsTo(() => UserTable)
  declare user: UserTable;

  @Column(DataType.STRING)
  declare token: string;

  @Column(DataType.DATE)
  declare expires: Date;

  public get pkName() {
    return "uuid" as keyof RefreshTokenTable;
  }
}

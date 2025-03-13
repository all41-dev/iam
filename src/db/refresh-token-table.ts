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
import { AuthUserTable } from "./auth-user-table";

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
  @ForeignKey(() => AuthUserTable)
  declare auth_user_uuid: string;

  @BelongsTo(() => AuthUserTable)
  declare user: AuthUserTable;

  @Column(DataType.STRING)
  declare token: string;

  @Column(DataType.DATE)
  declare expires: Date;

  public get pkName() {
    return "uuid" as keyof RefreshTokenTable;
  }
}

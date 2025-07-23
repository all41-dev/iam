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
import { DbUser } from "./db-user";

@Table({ tableName: "iam_refresh_token", timestamps: true, })
export class DbRefreshToken extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  @ForeignKey(() => DbUser)
  declare user_uuid: string;

  @BelongsTo(() => DbUser)
  declare user: DbUser;

  @Column(DataType.STRING)
  declare token: string;

  @Column(DataType.DATE)
  declare expires: Date;

  public get pkName() {
    return "uuid" as keyof DbRefreshToken;
  }
}

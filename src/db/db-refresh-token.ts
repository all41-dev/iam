import { Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { DbUser } from './db-user';
import { Table } from '@all41-dev/server.types';

/**
 * One row per refresh token. `token` holds the SHA-256 of the JWT, `jti` its id claim; a row
 * issued before the claim has a null `jti`, a bcrypt hash and no family.
 * A rotated row keeps its `rotated_at` until it expires, so a second presentation is told apart.
 * A family is one sign-in; every rotation expires with it.
 */
@Table({ tableName: 'iam_refresh_token', timestamps: true })
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

  @Column(DataType.STRING(36))
  declare jti: string | null;

  @Column(DataType.STRING)
  declare token: string;

  @Column(DataType.DATE)
  declare expires: Date;

  @Column(DataType.STRING(36))
  declare family_uuid: string | null;

  @Column(DataType.DATE)
  declare family_created_at: Date | null;

  @Column(DataType.DATE)
  declare rotated_at: Date | null;

  public get pkName() {
    return 'uuid' as keyof DbRefreshToken;
  }
}

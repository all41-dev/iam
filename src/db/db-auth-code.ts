import { Column, Model, DataType, PrimaryKey, AllowNull, ForeignKey } from 'sequelize-typescript';
import { DbUser } from './db-user';
import { Table } from '@all41-dev/server.types';

/**
 * A one-time sign-in code for an external front. The row holds no token: the tokens are minted
 * when the code is redeemed, so an unredeemed code leaks nothing.
 */
@Table({ tableName: 'iam_auth_code', timestamps: true })
export class DbAuthCode extends Model {
  @PrimaryKey
  @Column(DataType.STRING(64))
  declare code_hash: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  @ForeignKey(() => DbUser)
  declare user_uuid: string;

  @Column(DataType.STRING)
  declare impersonate_user_email: string | null;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare provider: string;

  @AllowNull(false)
  @Column(DataType.STRING(2048))
  declare redirect_path: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expires: Date;

  public get pkName() {
    return 'code_hash' as keyof DbAuthCode;
  }
}

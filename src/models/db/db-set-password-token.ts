import { Default, Column, DataType, Model, PrimaryKey, Table, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { DbRessource } from './db-ressource';

// @dbEntity
@Table({ modelName: 'setPasswordToken', tableName: 'setPasswordToken' })
export class DbSetPasswordToken extends Model<DbSetPasswordToken> {

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  public uuid?: string;

  @ForeignKey((): typeof DbRessource => DbRessource)
  @AllowNull
  @Column(DataType.UUID)
  IdUser?: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  Expires!: Date;

  @AllowNull
  @Column(DataType.STRING(2000))
  Message?: string;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  TokenHash!: string;

  @BelongsTo((): typeof DbRessource => DbRessource)
  public User?: DbRessource;
}

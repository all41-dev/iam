import { Default, Column, DataType, Model, PrimaryKey, Table, AllowNull, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { DbRessource } from './db-ressource';

// @dbEntity
@Table({ modelName: 'accessToken', tableName: 'accessToken' })
export class DbAccessToken extends Model<DbAccessToken> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  public uuid?: string;
  
  @ForeignKey((): typeof DbRessource => DbRessource)
  @AllowNull(false)
  @Column(DataType.UUID)
  idClient!: string;

  @ForeignKey((): typeof DbRessource => DbRessource)
  @AllowNull(false)
  @Column(DataType.UUID)
  idUser!: string;

  @AllowNull
  @Column(DataType.TEXT)
  scopes?: string;

  @AllowNull(false)
  @Column(DataType.STRING(256))
  tokenValue!: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  expiresAt!: Date;

  @BelongsTo((): typeof DbRessource => DbRessource, 'idClient')
  public client?: DbRessource;

  @BelongsTo((): typeof DbRessource => DbRessource, 'idUser')
  public user?: DbRessource;
}

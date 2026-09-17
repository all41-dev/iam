import { Column, DataType, Model, PrimaryKey, Default, AllowNull } from 'sequelize-typescript';
import { Table } from '@all41-dev/server.types';

@Table({ tableName: 'iam_user', timestamps: true })
export class DbUser extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare username: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare email: string;

  @Column(DataType.STRING(50))
  declare first_name: string;

  @Column(DataType.STRING(50))
  declare last_name: string;

  @Default('local')
  @Column(DataType.STRING(50))
  declare provider: string;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare validated: boolean;

  public get pkName() {
    return 'uuid' as keyof DbUser;
  }
}

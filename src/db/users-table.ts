import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  Default,
  AllowNull
} from 'sequelize-typescript';

@Table({tableName: 'user', timestamps: false})
export class UserTable extends Model {
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
  declare firstName: string;

  @Column(DataType.STRING(50))
  declare lastName: string;

  @Default('local')
  @Column(DataType.STRING(50))
  declare provider: string;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare allowed: boolean;

  public get pkName() { return 'uuid' as keyof UserTable; }

}

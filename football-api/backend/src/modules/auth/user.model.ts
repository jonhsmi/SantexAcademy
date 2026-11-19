import { AutoIncrement, Column, DataType, Model, PrimaryKey, Table, Unique } from 'sequelize-typescript';
import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';

// Representa las cuentas locales; passwordHash contiene el derivado de scrypt.
@Table({ tableName: 'users', timestamps: true })
export class UserModel extends Model<
  InferAttributes<UserModel>,
  InferCreationAttributes<UserModel>
> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: CreationOptional<number>;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare name: string;

  @Unique
  @Column({ type: DataType.STRING(190), allowNull: false })
  declare email: string;

  @Column({ field: 'password_hash', type: DataType.STRING(255), allowNull: false })
  declare passwordHash: string;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

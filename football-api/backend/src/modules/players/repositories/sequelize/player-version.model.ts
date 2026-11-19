import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';

// Guarda los cambios manuales por edición; el índice único permite actualizar la misma edición.
@Table({
  tableName: 'player_versions',
  timestamps: true,
  indexes: [{ unique: true, fields: ['player_id', 'year'] }],
})
export class PlayerVersionModel extends Model<
  InferAttributes<PlayerVersionModel>,
  InferCreationAttributes<PlayerVersionModel>
> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: CreationOptional<number>;

  @Column({ field: 'player_id', type: DataType.INTEGER, allowNull: false })
  declare playerId: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare year: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare rating: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 50 })
  declare pace: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 50 })
  declare shooting: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 50 })
  declare passing: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 50 })
  declare dribbling: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 50 })
  declare defending: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 50 })
  declare physical: number;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

// Marca qué CSV inicial ya se importó para que los reinicios sean idempotentes.
@Table({ tableName: 'dataset_imports', timestamps: false })
export class DatasetImportModel extends Model<
  InferAttributes<DatasetImportModel>,
  InferCreationAttributes<DatasetImportModel>
> {
  @PrimaryKey
  @Column({ type: DataType.STRING(100) })
  declare key: string;

  @Column({ field: 'completed_at', type: DataType.DATE, allowNull: true })
  declare completedAt: CreationOptional<Date | null>;
}

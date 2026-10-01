import { literal } from "sequelize";
import { AllowNull, AutoIncrement, Column, CreatedAt, DataType, Default, DeletedAt, Model, PrimaryKey, Table, UpdatedAt } from "sequelize-typescript";

@Table({
  tableName: 'admin',
  modelName: 'admin',
  timestamps: true,
  paranoid: true
})
export default class Admin extends Model {
  @PrimaryKey
  @AutoIncrement
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare password: string;

  @CreatedAt
  @AllowNull(false)
  @Default(literal('CURRENT_TIMESTAMP'))
  @Column(DataType.DATE)
  declare created_at: Date;

  @UpdatedAt
  @AllowNull(true)
  @Column(DataType.DATE)
  declare updated_at: Date | null;

  @DeletedAt
  @AllowNull(true)
  @Column(DataType.DATE)
  declare deleted_at: Date | null;
}

import { GameStatus } from '@server/config/const';
import { literal } from 'sequelize';
import {
  AllowNull, AutoIncrement, Column, CreatedAt, DataType, Default, DeletedAt, Model, PrimaryKey, Table, UpdatedAt, Unique,
} from 'sequelize-typescript';

@Table({ tableName: 'quiz_session', timestamps: true, paranoid: true })
export default class QuizSession extends Model {
  @PrimaryKey
  @AutoIncrement
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare id: number;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(12))
  declare code: string;

  @Column(DataType.STRING(50))
  declare name: string | null;

  @AllowNull(false)
  @Default(GameStatus.NotStarted)
  @Column(DataType.STRING(30))
  declare status: GameStatus;

  @Column(DataType.DATE)
  declare started_at: Date | null;

  @Column(DataType.DATE)
  declare finished_at: Date | null;

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

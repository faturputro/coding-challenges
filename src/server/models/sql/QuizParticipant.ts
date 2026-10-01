import { literal } from 'sequelize';
import {
  AllowNull,
  AutoIncrement,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'quiz_participant',
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: 'unique_quiz_participant__quiz_session_id__username', unique: true, fields: ['quiz_session_id', 'username'] },
    { name: 'idx_quiz_participant__quiz_session_id', fields: ['quiz_session_id'] }
  ],
})
export default class QuizParticipant extends Model {
  @PrimaryKey
  @AutoIncrement
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare id: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare quiz_session_id: number;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare user_id: string;

  @AllowNull(false)
  @Column(DataType.STRING(50))
  declare username: string;

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

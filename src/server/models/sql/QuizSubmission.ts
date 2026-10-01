import { literal } from 'sequelize';
import {
  AllowNull, AutoIncrement, Column, CreatedAt, DataType, Default, DeletedAt, Model, PrimaryKey, Table, UpdatedAt,
} from 'sequelize-typescript';

@Table({ tableName: 'quiz_submission', timestamps: true, paranoid: true,
  indexes: [
    { name: 'unique_quiz_submission__session_question_participant', unique: true, fields: ['quiz_session_id', 'quiz_question_id', 'quiz_participant_id'] },
    { name: 'idx_quiz_submission__quiz_session_id', fields: ['quiz_session_id'] }
  ],
})
export default class QuizSubmission extends Model {
  @PrimaryKey
  @AutoIncrement
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare id: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare quiz_session_id: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare quiz_question_id: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare quiz_participant_id: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.SMALLINT)
  declare score: number;

  @AllowNull(false)
  @Column(DataType.STRING(1))
  declare answer: string;

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

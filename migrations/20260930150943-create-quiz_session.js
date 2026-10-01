'use strict';

const dotenv = require('dotenv');
dotenv.config({ path: `${process.cwd()}/.env` });

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.createTable('admin', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: Sequelize.DATE,
        deleted_at: Sequelize.DATE,
      });

      await queryInterface.createTable('quiz_session', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        name: Sequelize.STRING(50),
        code: {
          type: Sequelize.STRING(12),
          allowNull: false,
          unique: true,
        },
        status: {
          type: Sequelize.STRING(30),
          allowNull: false,
          defaultValue: 'not_started',
        },
        started_at: Sequelize.DATE,
        finished_at: Sequelize.DATE,
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: Sequelize.DATE,
        deleted_at: Sequelize.DATE,
      }, {
        transaction: t,
      });
  
      await queryInterface.createTable('quiz_participant', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        quiz_session_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        username: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: Sequelize.DATE,
        deleted_at: Sequelize.DATE,
      }, {
        transaction: t,
      });
  
      await queryInterface.createTable('quiz_question', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        question: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        choices: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: Sequelize.DATE,
        deleted_at: Sequelize.DATE,
      }, {
        transaction: t,
      });

      await queryInterface.createTable('quiz_submission', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        quiz_session_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        quiz_question_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        quiz_participant_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        answer: Sequelize.STRING(1),
        score: {
          type: Sequelize.SMALLINT,
          allowNull: false,
          defaultValue: 0,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: Sequelize.DATE,
        deleted_at: Sequelize.DATE,
      }, {
        transaction: t,
      });

      await queryInterface.createTable('quiz_summary', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        quiz_session_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        quiz_participant_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        score: {
          type: Sequelize.SMALLINT,
          defaultValue: 0,
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: Sequelize.DATE,
        deleted_at: Sequelize.DATE,
      }, {
        transaction: t,
      });

      await queryInterface.addConstraint('quiz_participant', {
        name: 'unique_quiz_participant__quiz_session_id__user_id',
        type: 'unique',
        fields: ['quiz_session_id', 'user_id'],
        transaction: t,
      });

      await queryInterface.addConstraint('quiz_submission', {
        name: 'unique_quiz_submission__session_question_participant',
        type: 'unique',
        fields: ['quiz_session_id', 'quiz_question_id', 'quiz_participant_id'],
        transaction: t,
      });

      await queryInterface.addConstraint('quiz_summary', {
        name: 'unique_quiz_summary__quiz_session_id__quiz_participant_id',
        type: 'unique',
        fields: ['quiz_session_id', 'quiz_participant_id'],
        transaction: t,
      });

      await queryInterface.addIndex('quiz_summary', {
        name: 'idx_quiz_summary__quiz_session_id',
        fields: ['quiz_session_id'],
        transaction: t,
      });

      await queryInterface.addIndex('quiz_submission', {
        name: 'idx_quiz_submission__quiz_session_id',
        fields: ['quiz_session_id'],
        transaction: t,
      });
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('quiz_summary');
    await queryInterface.dropTable('quiz_submission');
    await queryInterface.dropTable('quiz_participant');
    await queryInterface.dropTable('quiz_question');
    await queryInterface.dropTable('quiz_session');
  }
};

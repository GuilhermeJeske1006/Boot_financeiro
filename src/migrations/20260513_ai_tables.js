/**
 * Migration: AI Conversational Tables
 *
 * ai_conversations — histórico persistente de mensagens por usuário
 * ai_actions_log  — auditoria de todas as actions executadas pela IA
 *
 * Run: node src/migrations/20260513_ai_tables.js
 */

require('dotenv').config();

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false,
  }
);

async function up(qi) {
  const tables = await qi.showAllTables();

  // ── ai_conversations ────────────────────────────────────────────────────
  if (!tables.includes('ai_conversations')) {
    await qi.createTable('ai_conversations', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      role: {
        type: DataTypes.ENUM('user', 'assistant'),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await qi.addIndex('ai_conversations', ['user_id', 'created_at'], {
      name: 'idx_ai_conversations_user_created',
    });

    console.log('✅ tabela ai_conversations criada');
  } else {
    console.log('⏭  ai_conversations já existe — pulando');
  }

  // ── ai_actions_log ──────────────────────────────────────────────────────
  if (!tables.includes('ai_actions_log')) {
    await qi.createTable('ai_actions_log', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      tool_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      input: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      result: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      confirmed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      executed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await qi.addIndex('ai_actions_log', ['user_id', 'executed_at'], {
      name: 'idx_ai_actions_log_user_executed',
    });
    await qi.addIndex('ai_actions_log', ['tool_name'], {
      name: 'idx_ai_actions_log_tool',
    });

    console.log('✅ tabela ai_actions_log criada');
  } else {
    console.log('⏭  ai_actions_log já existe — pulando');
  }
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado ao banco. Executando migration...\n');
    await up(sequelize.getQueryInterface());
    console.log('\nMigration concluída.');
  } catch (err) {
    console.error('Erro na migration:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

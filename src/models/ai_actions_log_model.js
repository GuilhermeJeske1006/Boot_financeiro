const { DataTypes, Model } = require('sequelize');

class AiActionsLog extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
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
          defaultValue: DataTypes.NOW,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'AiActionsLog',
        tableName: 'ai_actions_log',
      }
    );
  }
}

module.exports = AiActionsLog;

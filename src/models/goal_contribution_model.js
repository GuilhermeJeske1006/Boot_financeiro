const { DataTypes, Model } = require('sequelize');

class GoalContribution extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        goal_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'goals', key: 'id' },
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        note: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
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
        modelName: 'GoalContribution',
        tableName: 'goal_contributions',
      }
    );
  }
}

module.exports = GoalContribution;

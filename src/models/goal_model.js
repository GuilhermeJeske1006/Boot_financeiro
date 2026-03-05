const { DataTypes, Model } = require('sequelize');

class Goal extends Model {
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
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        target_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        current_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        deadline: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('active', 'completed', 'cancelled'),
          allowNull: false,
          defaultValue: 'active',
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
        modelName: 'Goal',
        tableName: 'goals',
      }
    );
  }
}

module.exports = Goal;

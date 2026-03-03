const { DataTypes, Model } = require('sequelize');

class CategoryBudget extends Model {
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
        category_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'categories', key: 'id' },
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        month: {
          type: DataTypes.STRING(7),
          allowNull: false, // format: YYYY-MM
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
        modelName: 'CategoryBudget',
        tableName: 'category_budgets',
        indexes: [
          { unique: true, fields: ['user_id', 'category_id', 'month'] },
        ],
      }
    );
  }
}

module.exports = CategoryBudget;

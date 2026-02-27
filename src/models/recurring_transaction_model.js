const { DataTypes, Model } = require('sequelize');

class RecurringTransaction extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        type: {
          type: DataTypes.ENUM('income', 'expense'),
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        category_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'categories', key: 'id' },
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
        frequency: {
          type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
          allowNull: false,
        },
        next_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
        modelName: 'RecurringTransaction',
        tableName: 'recurring_transactions',
        validate: {
          eitherUserOrCompany() {
            if (!this.user_id && !this.company_id) {
              throw new Error('Transação recorrente deve ter user_id ou company_id');
            }
            if (this.user_id && this.company_id) {
              throw new Error('Transação recorrente não pode ter user_id e company_id simultaneamente');
            }
          },
        },
      }
    );
  }
}

module.exports = RecurringTransaction;

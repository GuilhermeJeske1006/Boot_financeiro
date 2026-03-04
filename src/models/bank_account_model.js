const { DataTypes, Model } = require('sequelize');

class BankAccount extends Model {
  static init(sequelize) {
    super.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        bank_connection_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'bank_connections', key: 'id' },
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
        },
        pluggy_account_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        name: { type: DataTypes.STRING(255), allowNull: true },
        type: { type: DataTypes.STRING(50), allowNull: true },
        balance: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
        currency_code: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: 'BRL',
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
        modelName: 'BankAccount',
        tableName: 'bank_accounts',
      }
    );
  }
}

module.exports = BankAccount;

const { DataTypes, Model } = require('sequelize');

class BankConnection extends Model {
  static init(sequelize) {
    super.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
        },
        pluggy_item_id: { type: DataTypes.STRING(255), allowNull: false },
        institution_name: { type: DataTypes.STRING(255), allowNull: true },
        institution_id: { type: DataTypes.STRING(50), allowNull: true },
        status: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'pending',
        },
        last_sync_at: { type: DataTypes.DATE, allowNull: true },
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
        modelName: 'BankConnection',
        tableName: 'bank_connections',
      }
    );
  }
}

module.exports = BankConnection;

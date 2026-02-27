const { DataTypes, Model } = require('sequelize');

class Plan extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: DataTypes.ENUM('free', 'pro', 'business'),
          allowNull: false,
          unique: true,
        },
        display_name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        price_brl: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        // Limites do plano (-1 = ilimitado)
        max_transactions_per_month: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 50,
        },
        max_companies: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        // Features booleanas
        whatsapp_reports: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        pdf_export: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        multi_user: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
        modelName: 'Plan',
        tableName: 'plans',
      }
    );
  }
}

module.exports = Plan;

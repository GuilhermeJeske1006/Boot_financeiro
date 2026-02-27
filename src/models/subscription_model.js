const { DataTypes, Model } = require('sequelize');

class Subscription extends Model {
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
          references: {
            model: 'users',
            key: 'id',
          },
        },
        plan_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'plans',
            key: 'id',
          },
        },
        status: {
          type: DataTypes.ENUM('active', 'cancelled', 'expired', 'trial'),
          allowNull: false,
          defaultValue: 'active',
        },
        starts_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: true, // null = sem expiração (free plan)
        },
        payment_provider: {
          type: DataTypes.ENUM('manual', 'stripe', 'abacatepay'),
          allowNull: false,
          defaultValue: 'manual',
        },
        external_subscription_id: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        billing_url: {
          type: DataTypes.TEXT,
          allowNull: true,
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
        modelName: 'Subscription',
        tableName: 'subscriptions',
      }
    );
  }
}

module.exports = Subscription;

const { DataTypes, Model } = require('sequelize');

class Policy extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        policy_number: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        policy_type: {
          type: DataTypes.ENUM('health', 'life', 'auto', 'home', 'business'),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive', 'pending', 'cancelled', 'expired'),
          allowNull: false,
          defaultValue: 'pending',
        },
        premium_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        coverage_amount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
        },
        start_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        end_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        payment_frequency: {
          type: DataTypes.ENUM('monthly', 'quarterly', 'semi-annual', 'annual'),
          allowNull: false,
          defaultValue: 'monthly',
        },
        beneficiary_name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        beneficiary_relationship: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        notes: {
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
        modelName: 'Policy',
        tableName: 'policies',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      }
    );
  }
}

module.exports = Policy;

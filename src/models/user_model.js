const { DataTypes, Model } = require('sequelize');

class User extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        phone: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        password: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        user_type: {
          type: DataTypes.ENUM('PF', 'PJ'),
          allowNull: false,
          defaultValue: 'PF',
        },
        tax_id: {
          type: DataTypes.STRING(14),
          allowNull: true,
        },
        remember_token: {
          type: DataTypes.STRING,
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
        modelName: 'User',
        tableName: 'users',
        indexes: [
          { name: 'users_phone_unique', unique: true, fields: ['phone'] },
          { name: 'users_email_unique', unique: true, fields: ['email'] },
        ],
      }
    );
  }
}

module.exports = User;

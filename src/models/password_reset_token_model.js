const { DataTypes, Model } = require('sequelize');

class PasswordResetToken extends Model {
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
        token: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        used: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'PasswordResetToken',
        tableName: 'password_reset_tokens',
        timestamps: false,
      }
    );
  }
}

module.exports = PasswordResetToken;

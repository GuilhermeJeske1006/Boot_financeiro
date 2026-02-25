const { DataTypes, Model } = require('sequelize');

class Session extends Model {
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
        token: {
          type: DataTypes.STRING(512),
          allowNull: false,
          unique: true,
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Session',
        tableName: 'sessions',
        updatedAt: false,
      }
    );
  }
}

module.exports = Session;

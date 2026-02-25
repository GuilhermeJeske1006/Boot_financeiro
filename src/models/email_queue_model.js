const { DataTypes, Model } = require('sequelize');

class EmailQueue extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        to_email: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        subject: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        body: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('pending', 'sent', 'failed'),
          allowNull: false,
          defaultValue: 'pending',
        },
        attempts: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0,
        },
        error_message: {
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
        modelName: 'EmailQueue',
        tableName: 'email_queue',
      }
    );
  }
}

module.exports = EmailQueue;

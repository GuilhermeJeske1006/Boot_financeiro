const { DataTypes, Model } = require('sequelize');

class UserCompanyMember extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true, // null enquanto o convite não foi aceito
        },
        invited_email: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        role: {
          type: DataTypes.ENUM('member', 'viewer'),
          allowNull: false,
          defaultValue: 'member',
        },
        status: {
          type: DataTypes.ENUM('invited', 'active'),
          allowNull: false,
          defaultValue: 'invited',
        },
        invitation_token: {
          type: DataTypes.STRING(64),
          allowNull: true,
          unique: true,
        },
        expires_at: {
          type: DataTypes.DATE,
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
        modelName: 'UserCompanyMember',
        tableName: 'user_company_members',
      }
    );
  }
}

module.exports = UserCompanyMember;

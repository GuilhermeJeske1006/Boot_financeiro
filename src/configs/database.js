const { Sequelize } = require('sequelize');
const SlackService = require('../services/slack_service');

class Database {
  constructor() {
    this.connection = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false,
        define: {
          timestamps: true,
          underscored: true
        }
      }
    );
  }

  async connect() {
    try {
      await this.connection.authenticate();
      console.log('✅ Banco de dados conectado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao conectar no banco:', error);
      SlackService.notifyError(error, { route: 'database.connect' });
      setTimeout(() => process.exit(1), 1500);
    }
  }
}

module.exports = new Database();

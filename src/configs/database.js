const { Sequelize } = require('sequelize');

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
      process.exit(1);
    }
  }
}

module.exports = new Database();

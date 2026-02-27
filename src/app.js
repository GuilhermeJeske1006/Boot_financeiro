require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'local'}` });
const validateEnv = require('./configs/env_validator');
validateEnv();

require("jsonwebtoken");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const database = require('./configs/database');
const routes = require('./routes');
const errorHandler = require('./middlewares/error_handler');
const seedCategories = require('./configs/seed_categories');
const seedPlans = require('./configs/seed_plans');

const app = express();

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origem não permitida'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));

app.use('/api', routes);

// Deve ficar após todas as rotas — captura erros passados via next(err)
app.use(errorHandler);

// Conecta no banco, sincroniza tabelas e popula dados iniciais.
// Chamado em server.js antes do app.listen() para evitar race condition.
// TODO: substituir database.sync() por migrations do Sequelize — https://sequelize.org/docs/v6/other-topics/migrations/
async function dbInit() {
  await database.connect();
  await database.connection.sync();
  await seedCategories();
  await seedPlans();
}

module.exports = app;
module.exports.dbInit = dbInit;

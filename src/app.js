require('dotenv').config();
require("jsonwebtoken");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const database = require('./configs/database');
const routes = require('./routes');
const seedCategories = require('./configs/seed_categories');

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

// conecta no banco e sincroniza tabelas
(async () => {
  await database.connect();
  await database.connection.sync({ alter: true });
  await seedCategories();
})();

app.use('/api', routes);

module.exports = app;

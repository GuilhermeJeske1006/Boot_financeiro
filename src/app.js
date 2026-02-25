require('dotenv').config();
require("jsonwebtoken");
const express = require('express');
const cors = require('cors');
const database = require('./configs/database');
const routes = require('./routes');
const seedCategories = require('./configs/seed_categories');

const app = express();

app.use(cors());

app.use(express.json());

// conecta no banco e sincroniza tabelas
(async () => {
  await database.connect();
  await database.connection.sync({ alter: true });
  await seedCategories();
})();

app.use('/api', routes);

module.exports = app;

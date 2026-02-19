const database = require('../configs/database');

// importe todos os models aqui
const User = require('./user_model');
const Category = require('./category_model');
const Transaction = require('./transaction_model');

// inicializa os models
User.init(database.connection);
Category.init(database.connection);
Transaction.init(database.connection);

// associations
Category.hasMany(Transaction, { foreignKey: 'category_id', as: 'transactions' });
Transaction.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

User.hasMany(Category, { foreignKey: 'user_id', as: 'categories' });
Category.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  User,
  Category,
  Transaction,
};

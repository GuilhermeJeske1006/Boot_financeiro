const database = require('../configs/database');

// importe todos os models aqui
const User = require('./user_model');
const Category = require('./category_model');
const Transaction = require('./transaction_model');
const Company = require('./company_model');

// inicializa os models
User.init(database.connection);
Category.init(database.connection);
Transaction.init(database.connection);
Company.init(database.connection);

// associations
Category.hasMany(Transaction, { foreignKey: 'category_id', as: 'transactions' });
Transaction.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

User.hasMany(Category, { foreignKey: 'user_id', as: 'categories' });
Category.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Company, { foreignKey: 'user_id', as: 'companies' });
Company.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Company.hasMany(Transaction, { foreignKey: 'company_id', as: 'transactions' });
Transaction.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

module.exports = {
  User,
  Category,
  Transaction,
  Company,
};

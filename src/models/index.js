const database = require('../configs/database');

const User = require('./user_model');
const Category = require('./category_model');
const Transaction = require('./transaction_model');
const Company = require('./company_model');
const Session = require('./session_model');
const PasswordResetToken = require('./password_reset_token_model');
const EmailQueue = require('./email_queue_model');
const Plan = require('./plan_model');
const Subscription = require('./subscription_model');
const RecurringTransaction = require('./recurring_transaction_model');

User.init(database.connection);
Category.init(database.connection);
Transaction.init(database.connection);
Company.init(database.connection);
Session.init(database.connection);
PasswordResetToken.init(database.connection);
EmailQueue.init(database.connection);
Plan.init(database.connection);
Subscription.init(database.connection);
RecurringTransaction.init(database.connection);

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

User.hasMany(Session, { foreignKey: 'user_id', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(PasswordResetToken, { foreignKey: 'user_id', as: 'passwordResetTokens' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Plan.hasMany(Subscription, { foreignKey: 'plan_id', as: 'subscriptions' });
Subscription.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });

User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Category.hasMany(RecurringTransaction, { foreignKey: 'category_id', as: 'recurringTransactions' });
RecurringTransaction.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

User.hasMany(RecurringTransaction, { foreignKey: 'user_id', as: 'recurringTransactions' });
RecurringTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Company.hasMany(RecurringTransaction, { foreignKey: 'company_id', as: 'recurringTransactions' });
RecurringTransaction.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

module.exports = {
  User,
  Category,
  Transaction,
  Company,
  Session,
  PasswordResetToken,
  EmailQueue,
  Plan,
  Subscription,
  RecurringTransaction,
};
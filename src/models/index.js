const database = require('../configs/database');

const User = require('./user_model');
const Category = require('./category_model');
const Transaction = require('./transaction_model');
const Session = require('./session_model');
const PasswordResetToken = require('./password_reset_token_model');
const EmailQueue = require('./email_queue_model');
const Plan = require('./plan_model');
const Subscription = require('./subscription_model');
const RecurringTransaction = require('./recurring_transaction_model');
const CategoryBudget = require('./category_budget_model');
const Goal = require('./goal_model');
const GoalContribution = require('./goal_contribution_model');
const AiConversation = require('./ai_conversation_model');
const AiActionsLog = require('./ai_actions_log_model');

User.init(database.connection);
Category.init(database.connection);
Transaction.init(database.connection);
Session.init(database.connection);
PasswordResetToken.init(database.connection);
EmailQueue.init(database.connection);
Plan.init(database.connection);
Subscription.init(database.connection);
RecurringTransaction.init(database.connection);
CategoryBudget.init(database.connection);
Goal.init(database.connection);
GoalContribution.init(database.connection);
AiConversation.init(database.connection);
AiActionsLog.init(database.connection);

// associations
Category.hasMany(Transaction, { foreignKey: 'category_id', as: 'transactions' });
Transaction.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

User.hasMany(Category, { foreignKey: 'user_id', as: 'categories' });
Category.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

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

User.hasMany(CategoryBudget, { foreignKey: 'user_id', as: 'categoryBudgets' });
CategoryBudget.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Category.hasMany(CategoryBudget, { foreignKey: 'category_id', as: 'budgets' });
CategoryBudget.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

User.hasMany(Goal, { foreignKey: 'user_id', as: 'goals' });
Goal.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Goal.hasMany(GoalContribution, { foreignKey: 'goal_id', as: 'contributions' });
GoalContribution.belongsTo(Goal, { foreignKey: 'goal_id', as: 'goal' });

User.hasMany(AiConversation, { foreignKey: 'user_id', as: 'aiConversations' });
AiConversation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(AiActionsLog, { foreignKey: 'user_id', as: 'aiActionsLogs' });
AiActionsLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  User,
  Category,
  Transaction,
  Session,
  PasswordResetToken,
  EmailQueue,
  Plan,
  Subscription,
  RecurringTransaction,
  CategoryBudget,
  Goal,
  GoalContribution,
  AiConversation,
  AiActionsLog,
};
/**
 * Migration: AbacatePay → Stripe
 *
 * users:
 *   ADD stripe_customer_id VARCHAR(255) NULL
 *
 * subscriptions:
 *   DROP billing_url  (AbacatePay reuse URL — not used with Stripe)
 *
 * Run: node src/migrations/20260513_stripe_migration.js
 */

require('dotenv').config();

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false,
  }
);

async function up(qi) {
  const usersColumns = await qi.describeTable('users');
  const subsColumns  = await qi.describeTable('subscriptions');

  if (!usersColumns.stripe_customer_id) {
    await qi.addColumn('users', 'stripe_customer_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
    console.log('✅ users.stripe_customer_id adicionada');
  } else {
    console.log('⏭  users.stripe_customer_id já existe — pulando');
  }

  if (subsColumns.billing_url) {
    await qi.removeColumn('subscriptions', 'billing_url');
    console.log('✅ subscriptions.billing_url removida');
  } else {
    console.log('⏭  subscriptions.billing_url não existe — pulando');
  }
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado ao banco. Executando migration...\n');
    await up(sequelize.getQueryInterface());
    console.log('\nMigration concluída.');
  } catch (err) {
    console.error('Erro na migration:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

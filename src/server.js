const app = require('./app');
const SlackService = require('./services/slack_service');
const { initializeWhatsApp } = require('./whatsapp/client');
const { startMonthlyCron } = require('./cron/monthly_report');
const { startSubscriptionRenewalCron } = require('./cron/subscription_renewal');
const { startRecurringTransactionsCron } = require('./cron/recurring_transactions');

// Captura erros não tratados e notifica o Slack antes de encerrar
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
  SlackService.notifyError(err, { route: 'uncaughtException' });
  setTimeout(() => process.exit(1), 1500);
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  console.error('[FATAL] unhandledRejection:', err);
  SlackService.notifyError(err, { route: 'unhandledRejection' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// inicia o bot do WhatsApp
initializeWhatsApp();

// inicia o cron job de relatório mensal
startMonthlyCron();

// inicia o cron job de renovação de assinaturas
startSubscriptionRenewalCron();

// inicia o cron job de transações recorrentes
startRecurringTransactionsCron();

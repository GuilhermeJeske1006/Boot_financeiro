const app = require('./app');
const { initializeWhatsApp } = require('./whatsapp/client');
const { startMonthlyCron } = require('./cron/monthly_report');
const { startSubscriptionRenewalCron } = require('./cron/subscription_renewal');

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// inicia o bot do WhatsApp
initializeWhatsApp();

// inicia o cron job de relatório mensal
startMonthlyCron();

// inicia o cron job de renovação de assinaturas
startSubscriptionRenewalCron();

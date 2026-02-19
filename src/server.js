const app = require('./app');
const { initializeWhatsApp } = require('./whatsapp/client');
const { startMonthlyCron } = require('./cron/monthly_report');

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// inicia o bot do WhatsApp
initializeWhatsApp();

// inicia o cron job de relatório mensal
startMonthlyCron();

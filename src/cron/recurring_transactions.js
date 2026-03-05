const cron = require('node-cron');
const RecurringTransactionService = require('../services/recurring_transaction_service');

async function notifyUser(phone, message) {
  try {
    const { getClient, markWebhookMessage } = require('../whatsapp/client');
    const client = getClient();
    if (!client) return;
    markWebhookMessage(phone);
    await client.sendMessage(phone, message);
  } catch (err) {
    console.error('Erro ao notificar recorrência via WhatsApp:', err.message);
  }
}

function startRecurringTransactionsCron() {
  // Executa todo dia à meia-noite
  cron.schedule('0 0 * * *', async () => {
    console.log('Processando transações recorrentes...');
    try {
      const { created, errors, notifications } = await RecurringTransactionService.processDue();
      console.log(`Transações recorrentes: ${created} criadas, ${errors} erros.`);

      for (const { phone, message } of notifications) {
        await notifyUser(phone, message);
      }
    } catch (error) {
      console.error('Erro ao processar transações recorrentes:', error);
    }
  });

  console.log('Cron job de transações recorrentes agendado.');
}

module.exports = { startRecurringTransactionsCron };

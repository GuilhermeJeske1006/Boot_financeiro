const cron = require('node-cron');
const RecurringTransactionService = require('../services/recurring_transaction_service');

async function notifyUser(phone, message) {
  try {
    const { sendMessage } = require('../whatsapp/client');
    await sendMessage(phone, message);
  } catch (err) {
    console.error('Erro ao notificar recorrência via WhatsApp:', err.message);
  }
}

function startRecurringTransactionsCron() {
  let running = false;

  cron.schedule('0 0 * * *', async () => {
    if (running) return;
    running = true;
    console.log('Processando transações recorrentes...');
    try {
      const { created, errors, notifications } = await RecurringTransactionService.processDue();
      console.log(`Transações recorrentes: ${created} criadas, ${errors} erros.`);

      await Promise.allSettled(
        notifications.map(({ phone, message }) => notifyUser(phone, message))
      );
    } catch (error) {
      console.error('Erro ao processar transações recorrentes:', error);
    } finally {
      running = false;
    }
  });

  console.log('Cron job de transações recorrentes agendado.');
}

module.exports = { startRecurringTransactionsCron };

const cron = require('node-cron');
const RecurringTransactionService = require('../services/recurring_transaction_service');

function startRecurringTransactionsCron() {
  // Executa todo dia à meia-noite
  cron.schedule('0 0 * * *', async () => {
    console.log('Processando transações recorrentes...');
    try {
      const { created, errors } = await RecurringTransactionService.processDue();
      console.log(`Transações recorrentes: ${created} criadas, ${errors} erros.`);
    } catch (error) {
      console.error('Erro ao processar transações recorrentes:', error);
    }
  });

  console.log('Cron job de transações recorrentes agendado.');
}

module.exports = { startRecurringTransactionsCron };

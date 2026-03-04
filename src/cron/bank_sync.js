const cron = require('node-cron');
const BankSyncService = require('../services/bank_sync_service');

function startBankSyncCron() {
  // Executa a cada 6 horas
  cron.schedule('0 */6 * * *', async () => {
    console.log('[BankSync] Iniciando sincronização agendada...');
    try {
      const { total, imported, errors } = await BankSyncService.syncAll();
      console.log(`[BankSync] ${total} conexões, ${imported} transações importadas, ${errors} erros.`);
    } catch (error) {
      console.error('[BankSync] Erro na sincronização agendada:', error.message);
    }
  });

  console.log('Cron job de sincronização bancária agendado (a cada 6h).');
}

module.exports = { startBankSyncCron };

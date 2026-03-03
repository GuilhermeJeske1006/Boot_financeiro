const cron = require('node-cron');
const EmailQueueService = require('../services/email_queue_service');

function startEmailQueueCron() {
  // Executa a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    try {
      const { sent, errors } = await EmailQueueService.processPending();
      if (sent > 0 || errors > 0) {
        console.log(`Email queue: ${sent} enviados, ${errors} erros.`);
      }
    } catch (error) {
      console.error('Erro ao processar fila de emails:', error);
    }
  });

  console.log('Cron job de fila de emails agendado.');
}

module.exports = { startEmailQueueCron };

const cron = require('node-cron');
const EmailQueueService = require('../services/email_queue_service');

function startEmailQueueCron() {
  let running = false;

  cron.schedule('*/5 * * * *', async () => {
    if (running) return;
    running = true;
    try {
      const { sent, errors } = await EmailQueueService.processPending();
      if (sent > 0 || errors > 0) {
        console.log(`Email queue: ${sent} enviados, ${errors} erros.`);
      }
    } catch (error) {
      console.error('Erro ao processar fila de emails:', error);
    } finally {
      running = false;
    }
  });

  console.log('Cron job de fila de emails agendado.');
}

module.exports = { startEmailQueueCron };

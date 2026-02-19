const cron = require('node-cron');
const ReportService = require('../services/report_service');
const UserRepository = require('../repositories/user_respository');
const { getClient } = require('../whatsapp/client');

function startMonthlyCron() {
  // executa às 20:00 nos dias 28-31 de cada mês
  // verifica se é realmente o último dia do mês antes de enviar
  cron.schedule('0 20 28-31 * *', async () => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (now.getDate() !== lastDayOfMonth) {
      return;
    }

    try {
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const client = getClient();
      if (!client) return;

      // envia relatório para cada usuário que tem telefone cadastrado
      const users = await UserRepository.findAll();
      for (const user of users) {
        if (!user.phone) continue;
        try {
          const report = await ReportService.generateMonthlyReport(year, month, user.id);
          await client.sendMessage(user.phone, report);
          console.log(`Relatório mensal ${month}/${year} enviado para ${user.phone}.`);
        } catch (err) {
          console.error(`Falha ao enviar relatório para ${user.phone}:`, err);
        }
      }
    } catch (error) {
      console.error('Falha ao enviar relatórios mensais:', error);
    }
  });

  console.log('Cron job de relatório mensal agendado.');
}

module.exports = { startMonthlyCron };

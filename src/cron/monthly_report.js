const cron = require('node-cron');
const ReportService = require('../services/report_service');
const UserRepository = require('../repositories/user_respository');
const SubscriptionService = require('../services/subscription_service');
const { sendMessage } = require('../whatsapp/client');

function startMonthlyCron() {
  let running = false;

  cron.schedule('0 20 28-31 * *', async () => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() !== lastDayOfMonth) return;
    if (running) return;
    running = true;

    try {
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;

      const users = await UserRepository.findAll();
      await Promise.allSettled(
        users
          .filter(u => u.phone)
          .map(async user => {
            try {
              const hasFeature = await SubscriptionService.hasFeature(user.id, 'whatsapp_reports');
              if (!hasFeature) return;

              const prevTotals = await ReportService.getMonthTotals(prevYear, prevMonth, user.id);
              const report = await ReportService.generateMonthlyReport(year, month, user.id, prevTotals);
              await sendMessage(user.phone, report);
              console.log(`Relatório mensal ${month}/${year} enviado para ${user.phone}.`);
            } catch (err) {
              console.error(`Falha ao enviar relatório para ${user.phone}:`, err);
            }
          })
      );
    } catch (error) {
      console.error('Falha ao enviar relatórios mensais:', error);
    } finally {
      running = false;
    }
  });

  console.log('Cron job de relatório mensal agendado.');
}

module.exports = { startMonthlyCron };

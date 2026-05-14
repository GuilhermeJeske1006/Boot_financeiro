const cron = require('node-cron');
const UserRepository = require('../repositories/user_respository');
const SubscriptionService = require('../services/subscription_service');
const InsightsService = require('../whatsapp/services/insights_service');
const { sendMessage } = require('../whatsapp/client');

function startWeeklyInsightsCron() {
  let running = false;

  cron.schedule('0 9 * * 5', async () => {
    if (running) return;
    running = true;
    try {
      const users = await UserRepository.findAll();
      await Promise.allSettled(
        users
          .filter(u => u.phone)
          .map(async user => {
            try {
              const hasFeature = await SubscriptionService.hasFeature(user.id, 'whatsapp_reports');
              if (!hasFeature) return;

              const insight = await InsightsService.generateWeeklyInsight(user.id);
              await sendMessage(user.phone, insight);
              console.log(`Insight semanal enviado para ${user.phone}.`);
            } catch (err) {
              console.error(`Falha ao enviar insight para ${user.phone}:`, err.message);
            }
          })
      );
    } catch (error) {
      console.error('Falha no cron de insights semanais:', error);
    } finally {
      running = false;
    }
  });

  console.log('Cron job de insights semanais agendado (sextas às 9h).');
}

module.exports = { startWeeklyInsightsCron };

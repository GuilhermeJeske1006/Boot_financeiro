const cron = require('node-cron');
const UserRepository = require('../repositories/user_respository');
const SubscriptionService = require('../services/subscription_service');
const InsightsService = require('../whatsapp/services/insights_service');
const { getClient, markWebhookMessage } = require('../whatsapp/client');

function startWeeklyInsightsCron() {
  // Toda sexta-feira às 9h
  cron.schedule('0 9 * * 5', async () => {
    try {
      const client = getClient();
      if (!client) return;

      const users = await UserRepository.findAll();
      for (const user of users) {
        if (!user.phone) continue;
        try {
          const hasFeature = await SubscriptionService.hasFeature(user.id, 'whatsapp_reports');
          if (!hasFeature) continue;

          const insight = await InsightsService.generateWeeklyInsight(user.id);
          markWebhookMessage(user.phone);
          await client.sendMessage(user.phone, insight);
          console.log(`Insight semanal enviado para ${user.phone}.`);
        } catch (err) {
          console.error(`Falha ao enviar insight para ${user.phone}:`, err.message);
        }
      }
    } catch (error) {
      console.error('Falha no cron de insights semanais:', error);
    }
  });

  console.log('Cron job de insights semanais agendado (sextas às 9h).');
}

module.exports = { startWeeklyInsightsCron };

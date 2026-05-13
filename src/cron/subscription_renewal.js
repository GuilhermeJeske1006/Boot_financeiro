const cron = require('node-cron');
const SubscriptionRepository = require('../repositories/subscription_repository');
const { sendMessage } = require('../whatsapp/client');

// Runs daily at 10:00 — downgrades Stripe subscriptions that expired
// (safety net for missed webhooks; normally Stripe handles via customer.subscription.deleted)
function startSubscriptionRenewalCron() {
  cron.schedule('0 10 * * *', async () => {
    try {
      const expired = await SubscriptionRepository.findExpired();

      for (const subscription of expired) {
        const user = subscription.user;
        try {
          await SubscriptionRepository.cancelToFreePlan(user.id);

          if (user?.phone) {
            await sendMessage(user.phone, [
              `ℹ️ *Assinatura expirada*`,
              ``,
              `Sua assinatura do plano *${subscription.plan?.display_name}* expirou.`,
              `Você foi movido para o plano *Grátis*.`,
              `Para reativar, acesse *Meu Plano* no menu do WhatsApp.`,
            ].join('\n'));
          }

          console.log(`[RenewalCron] Assinatura expirada encerrada para user ${user.id}`);
        } catch (err) {
          console.error(`[RenewalCron] Falha ao encerrar assinatura de ${user?.id}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[RenewalCron] Erro geral:', error.message);
    }
  });

  console.log('Cron job de renovação de assinaturas agendado.');
}

module.exports = { startSubscriptionRenewalCron };

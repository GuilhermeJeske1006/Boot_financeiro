const cron = require('node-cron');
const SubscriptionRepository = require('../repositories/subscription_repository');
const AbacatePayService = require('../services/abacatepay_service');
const { sendMessage } = require('../whatsapp/client');

const DAYS_BEFORE_EXPIRY = 5;

function startSubscriptionRenewalCron() {
  // Executa todo dia às 10:00
  cron.schedule('0 10 * * *', async () => {
    try {
      const expiring = await SubscriptionRepository.findExpiringSoon(DAYS_BEFORE_EXPIRY);

      for (const subscription of expiring) {
        const user = subscription.user;
        const plan = subscription.plan;

        if (!user?.phone) continue;

        try {
          const renewalUrl = await _getRenewalUrl(subscription, user, plan);
          const expiryDate = new Date(subscription.expires_at).toLocaleDateString('pt-BR');

          const msg = [
            `⚠️ *Sua assinatura vence em ${DAYS_BEFORE_EXPIRY} dias!*`,
            ``,
            `📦 Plano atual: *${plan.display_name}*`,
            `📅 Vencimento: *${expiryDate}*`,
            ``,
            `Para renovar e continuar sem interrupção, clique no link abaixo:`,
            ``,
            renewalUrl,
            ``,
            `✅ Após o pagamento, seu plano será renovado automaticamente por mais 30 dias.`,
          ].join('\n');

          await sendMessage(user.phone, msg);

          console.log(`[RenewalCron] Lembrete de renovação enviado para ${user.phone} (plano ${plan.name})`);
        } catch (err) {
          console.error(`[RenewalCron] Falha ao enviar lembrete para ${user?.phone}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[RenewalCron] Erro geral no cron de renovação:', error.message);
    }
  });

  console.log('Cron job de renovação de assinaturas agendado.');
}

async function _getRenewalUrl(subscription, user, plan) {
  // Reutiliza a URL do billing existente (MULTIPLE_PAYMENTS permite reuso)
  if (subscription.billing_url) {
    return subscription.billing_url;
  }

  // Fallback: gera novo link (para assinaturas antigas sem billing_url salvo)
  return AbacatePayService.createUpgradeLink(user, plan);
}

module.exports = { startSubscriptionRenewalCron };

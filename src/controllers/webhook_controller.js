const AbacatePayService = require('../services/abacatepay_service');
const SubscriptionRepository = require('../repositories/subscription_repository');
const UserRepository = require('../repositories/user_respository');
const SlackService = require('../services/slack_service');
const { getClient, markWebhookMessage } = require('../whatsapp/client');
const SessionManager = require('../whatsapp/session_manager');
const MainMenu = require('../whatsapp/menus/main_menu');
const BankConnectionRepository = require('../repositories/bank_connection_repository');
const BankSyncService = require('../services/bank_sync_service');

class WebhookController {
  async abacatePay(req, res) {
    // 1. Verifica o secret da query string
    const receivedSecret = req.query.webhookSecret;
    if (!AbacatePayService.verifyWebhookSecret(receivedSecret)) {
      return res.status(401).json({ error: 'Webhook secret inválido' });
    }

    const event = req.body;

    // 2. Só processa pagamentos confirmados
    if (event?.event !== 'billing.paid') {
      return res.status(200).json({ received: true });
    }

    try {
      const billing = event.data?.billing;
      const products = billing?.products || [];

      // 3. Extrai planName e userId do externalId do primeiro produto
      const parsed = products
        .map((p) => AbacatePayService.parseProductExternalId(p.externalId))
        .find(Boolean);

      if (!parsed) {
        return res.status(400).json({ error: 'externalId inválido no produto' });
      }

      const { planName, userId } = parsed;

      // 4. Atualiza a assinatura no banco (salva também a URL do billing para renovações)
      await SubscriptionRepository.upgradeByPayment(userId, planName, billing.id, billing.url ?? null);

      // 5. Notifica o Slack sobre a nova assinatura
      const user = await UserRepository.findById(userId);
      SlackService.notifySubscription({
        userId,
        userName: user?.name,
        userEmail: user?.email,
        planName,
        billingId: billing.id,
      });

      // 6. Envia confirmação no WhatsApp
      await _sendConfirmationWhatsApp(userId, planName);

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('Erro ao processar webhook AbacatePay:', error.message);
      return res.status(500).json({ error: 'Erro interno ao processar pagamento' });
    }
  }

  async pluggy(req, res) {
    const receivedSecret = req.headers['pluggy-secret'] || req.query.webhookSecret;
    if (process.env.PLUGGY_WEBHOOK_SECRET && receivedSecret !== process.env.PLUGGY_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Webhook secret inválido' });
    }

    const { item } = req.body;

    // Responde imediatamente — Pluggy exige resposta rápida
    res.status(200).json({ received: true });

    if (!item?.id) return;

    try {
      const conn = await BankConnectionRepository.findByPluggyItemId(item.id);
      if (!conn) return;

      const pluggyStatus = item.status;
      let localStatus = conn.status;

      if (pluggyStatus === 'UPDATED') {
        localStatus = 'connected';
      } else if (pluggyStatus === 'OUTDATED') {
        localStatus = 'outdated';
      } else if (['LOGIN_ERROR', 'WAITING_USER_INPUT'].includes(pluggyStatus)) {
        localStatus = 'error';
      }

      await BankConnectionRepository.updateStatus(conn.id, localStatus);

      if (pluggyStatus === 'UPDATED') {
        BankSyncService.syncConnection(conn.id)
          .then(({ imported }) => {
            if (imported > 0) {
              _notifyBankSyncWhatsApp(conn.user_id, conn.institution_name, imported).catch(() => {});
            }
          })
          .catch((err) => console.error('[BankSync webhook]', err.message));
      }
    } catch (error) {
      console.error('[Pluggy webhook] Erro:', error.message);
    }
  }
}

async function _notifyBankSyncWhatsApp(userId, institutionName, count) {
  const wClient = getClient();
  const user = await UserRepository.findById(userId);
  if (!wClient || !user?.phone) return;

  const msg = [
    `🏦 *Open Banking — Sincronização concluída!*`,
    ``,
    `${count} nova(s) transação(ões) importada(s) do ${institutionName || 'seu banco'}.`,
    ``,
    `Digite *menu* para ver seu extrato atualizado.`,
  ].join('\n');

  markWebhookMessage(user.phone);
  await wClient.sendMessage(user.phone, msg);
}

async function _sendConfirmationWhatsApp(userId, planName) {
  const wClient = getClient();
  const user = await UserRepository.findById(userId);
  if (!wClient || !user?.phone) return;

  const planLabels = { pro: 'Pro', business: 'Business' };
  const label = planLabels[planName] || planName;

  const confirmationMessage = [
    `✅ *Pagamento confirmado! Plano ${label} ativado.*`,
    '',
    `Olá ${user.name}, sua assinatura do plano *${label}* está ativa.`,
    '',
    planName === 'pro'
      ? '📊 Você agora tem:\n• Transações ilimitadas\n• Relatórios automáticos no WhatsApp\n• Exportação PDF e Excel'
      : '🏢 Você agora tem:\n• Transações ilimitadas\n• Empresas ilimitadas\n• Múltiplos usuários por empresa\n• Relatórios automáticos\n• Exportação PDF e Excel',
    '',
    'Bom uso! 🚀',
  ].join('\n');

  markWebhookMessage(user.phone);
  await wClient.sendMessage(user.phone, confirmationMessage);

  SessionManager.resetSession(user.phone);

  const mainMenuText = await MainMenu.show(userId);
  markWebhookMessage(user.phone);
  await wClient.sendMessage(user.phone, mainMenuText);
}

module.exports = new WebhookController();

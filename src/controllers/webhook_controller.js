const PaymentGateway = require('../services/payment_gateway');
const SubscriptionRepository = require('../repositories/subscription_repository');
const UserRepository = require('../repositories/user_respository');
const SlackService = require('../services/slack_service');
const { sendMessage } = require('../whatsapp/client');
const SessionManager = require('../whatsapp/session_manager');
const MainMenu = require('../whatsapp/menus/main_menu');

class WebhookController {
  async stripe(req, res) {
    const signature = req.headers['stripe-signature'];

    let event;
    try {
      event = PaymentGateway.verifyWebhookSignature(req.body, signature);
    } catch (err) {
      console.error('[Stripe Webhook] Assinatura inválida:', err.message);
      return res.status(400).json({ error: 'Webhook signature inválida' });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await _handleCheckoutCompleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await _handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await _handlePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await _handleSubscriptionDeleted(event.data.object);
          break;
        case 'customer.subscription.updated':
          await _handleSubscriptionUpdated(event.data.object);
          break;
      }
    } catch (error) {
      console.error('[Stripe Webhook] Erro ao processar evento:', error.message);
      void SlackService.notifyError(error, { route: 'webhook.stripe', method: 'POST' });
      return res.status(500).json({ error: 'Erro interno ao processar evento' });
    }

    return res.status(200).json({ received: true });
  }
}

async function _handleCheckoutCompleted(session) {
  const userId = parseInt(session.metadata?.userId);
  const planName = session.metadata?.planName;
  if (!userId || !planName) return;

  const subscriptionId = session.subscription;
  await SubscriptionRepository.upgradeByPayment(userId, planName, subscriptionId);

  const user = await UserRepository.findById(userId);
  SlackService.notifySubscription({
    userId,
    userName: user?.name,
    userEmail: user?.email,
    planName,
    billingId: subscriptionId,
  });

  await _sendConfirmationWhatsApp(userId, planName);
}

async function _handlePaymentSucceeded(invoice) {
  // First payment is handled by checkout.session.completed
  if (invoice.billing_reason === 'subscription_create') return;

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  await SubscriptionRepository.renewBySubscriptionId(subscriptionId, invoice.period_end);
}

async function _handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  if (!customerId) return;

  const user = await UserRepository.findByStripeCustomerId(customerId);
  if (!user?.phone) return;

  let portalUrl;
  try {
    portalUrl = await PaymentGateway.createPortalSession(customerId);
  } catch (_) {
    portalUrl = process.env.APP_URL;
  }

  await sendMessage(user.phone, [
    `⚠️ *Falha no pagamento da sua assinatura*`,
    ``,
    `Não conseguimos processar o pagamento do seu plano Pro.`,
    ``,
    `Acesse o link abaixo para atualizar seu cartão:`,
    `🔗 ${portalUrl}`,
    ``,
    `Seu acesso será mantido até o próximo ciclo de cobrança.`,
  ].join('\n'));
}

async function _handleSubscriptionDeleted(subscription) {
  const userId = parseInt(subscription.metadata?.userId);
  if (!userId) return;

  await SubscriptionRepository.cancelToFreePlan(userId);

  const user = await UserRepository.findById(userId);
  if (!user?.phone) return;

  await sendMessage(user.phone, [
    `ℹ️ *Assinatura encerrada*`,
    ``,
    `Sua assinatura foi cancelada e você foi movido para o plano *Grátis*.`,
    `Para reativar, acesse *Meu Plano* no menu do WhatsApp.`,
  ].join('\n'));
}

async function _handleSubscriptionUpdated(subscription) {
  if (subscription.status !== 'past_due' && subscription.status !== 'unpaid') return;

  const customerId = subscription.customer;
  const user = await UserRepository.findByStripeCustomerId(customerId);
  if (!user?.phone) return;

  let portalUrl;
  try {
    portalUrl = await PaymentGateway.createPortalSession(customerId);
  } catch (_) {
    portalUrl = process.env.APP_URL;
  }

  await sendMessage(user.phone, [
    `⚠️ *Pagamento em atraso*`,
    ``,
    `Sua assinatura está com pagamento pendente. Atualize seu cartão para evitar o cancelamento:`,
    `🔗 ${portalUrl}`,
  ].join('\n'));
}

async function _sendConfirmationWhatsApp(userId, planName) {
  const user = await UserRepository.findById(userId);
  if (!user?.phone) return;

  const planLabels = { pro: 'Pro' };
  const label = planLabels[planName] || planName;

  const msg = [
    `✅ *Pagamento confirmado! Plano ${label} ativado.*`,
    ``,
    `Olá ${user.name}, sua assinatura do plano *${label}* está ativa com renovação automática mensal.`,
    ``,
    planName === 'pro'
      ? `📊 Você agora tem:\n• Transações ilimitadas\n• Relatórios automáticos no WhatsApp\n• Exportação PDF e Excel`
      : ``,
    ``,
    `Bom uso! 🚀`,
  ].join('\n');

  await sendMessage(user.phone, msg);
  SessionManager.resetSession(user.phone);

  const mainMenuText = await MainMenu.show(userId);
  await sendMessage(user.phone, mainMenuText);
}

module.exports = new WebhookController();

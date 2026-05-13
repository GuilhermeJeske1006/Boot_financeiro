const SubscriptionService = require('../services/subscription_service');
const PaymentGateway = require('../services/payment_gateway');
const SubscriptionRepository = require('../repositories/subscription_repository');
const UserRepository = require('../repositories/user_respository');
const { sendMessage } = require('../whatsapp/client');

async function sendUpgradeWhatsApp(user, plans, links) {
  if (!user.phone) return;

  const proLink = links.pro || null;

  const lines = [
    '🚫 *Limite do plano gratuito atingido!*',
    '',
    `Olá ${user.name}, você utilizou todas as ${plans.free?.max_transactions_per_month || 30} transações gratuitas deste mês.`,
    '',
    'Para continuar lançando transações, escolha um plano:',
    '',
  ];

  if (proLink) {
    lines.push(
      `📊 *Plano Pro — R$ ${parseFloat(plans.pro.price_brl).toFixed(2).replace('.', ',')}/mês*`,
      '✅ Transações ilimitadas',
      '✅ Relatórios automáticos no WhatsApp',
      '✅ Exportação PDF e Excel',
      '💳 Pagamento via cartão com renovação automática',
      `🔗 Assinar: ${proLink}`,
      '',
    );
  }

  await sendMessage(user.phone, lines.join('\n'));
}

class CheckPlan {
  async transactionLimit(req, res, next) {
    try {
      const allowed = await SubscriptionService.canCreateTransaction(req.userId);
      if (!allowed) {
        _notifyUpgradeAsync(req.userId).catch(() => {});

        return res.status(403).json({
          error: 'Limite de transações do plano atingido. Faça upgrade para continuar.',
          upgrade_url: '/api/subscriptions/plans',
        });
      }
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Não foi possível verificar o plano.' });
    }
  }

  requireFeature(feature) {
    return async (req, res, next) => {
      try {
        const allowed = await SubscriptionService.hasFeature(req.userId, feature);
        if (!allowed) {
          _notifyUpgradeAsync(req.userId).catch(() => {});

          return res.status(403).json({
            error: 'Esta funcionalidade requer um plano superior.',
            upgrade_url: '/api/subscriptions/plans',
          });
        }
        next();
      } catch (error) {
        return res.status(403).json({ error: 'Não foi possível verificar o plano.' });
      }
    };
  }
}

async function _notifyUpgradeAsync(userId) {
  const [user, allPlans] = await Promise.all([
    UserRepository.findById(userId),
    SubscriptionRepository.findAllPlans(),
  ]);

  if (!user) return;

  const planMap = {};
  allPlans.forEach((p) => { planMap[p.name] = p; });

  const links = {};
  const paidPlans = allPlans.filter((p) => p.name !== 'free');

  await Promise.all(
    paidPlans.map(async (plan) => {
      try {
        links[plan.name] = await PaymentGateway.createCheckoutSession(user, plan);
      } catch (_) {
        // Skip if checkout session creation fails
      }
    })
  );

  await sendUpgradeWhatsApp(user, planMap, links);
}

module.exports = new CheckPlan();

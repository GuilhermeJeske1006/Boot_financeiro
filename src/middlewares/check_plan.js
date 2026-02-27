const SubscriptionService = require('../services/subscription_service');
const AbacatePayService = require('../services/abacatepay_service');
const SubscriptionRepository = require('../repositories/subscription_repository');
const UserRepository = require('../repositories/user_respository');
const { getClient } = require('../whatsapp/client');

async function sendUpgradeWhatsApp(user, plans, links) {
  const wClient = getClient();
  if (!wClient || !user.phone) return;

  const proLink = links.pro || null;
  const businessLink = links.business || null;

  const lines = [
    '🚫 *Limite do plano gratuito atingido!*',
    '',
    `Olá ${user.name}, você utilizou todas as ${plans.free?.max_transactions_per_month || 50} transações gratuitas deste mês.`,
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
      `🔗 Assinar: ${proLink}`,
      '',
    );
  }

  if (businessLink) {
    lines.push(
      `🏢 *Plano Business — R$ ${parseFloat(plans.business.price_brl).toFixed(2).replace('.', ',')}/mês*`,
      '✅ Tudo do Pro',
      '✅ Empresas ilimitadas',
      '✅ Múltiplos usuários por empresa',
      `🔗 Assinar: ${businessLink}`,
    );
  }

  await wClient.sendMessage(user.phone, lines.join('\n'));
}

class CheckPlan {
  // Bloqueia se usuário atingiu o limite de transações e envia opções de upgrade no WhatsApp
  async transactionLimit(req, res, next) {
    try {
      const allowed = await SubscriptionService.canCreateTransaction(req.userId);
      if (!allowed) {
        // Envia notificação WhatsApp em background (não bloqueia a resposta HTTP)
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

  // Bloqueia se usuário não tem acesso a uma feature e envia opções de upgrade
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

// Busca usuário e planos, gera links e envia WhatsApp
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
        links[plan.name] = await AbacatePayService.createUpgradeLink(user, plan);
      } catch (_) {
        // Não falha silenciosamente — apenas não envia o link daquele plano
      }
    })
  );

  await sendUpgradeWhatsApp(user, planMap, links);
}

module.exports = new CheckPlan();

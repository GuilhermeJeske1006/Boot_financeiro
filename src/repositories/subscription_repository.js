const { Subscription, Plan, Transaction } = require('../models');
const { Op } = require('sequelize');

class SubscriptionRepository {
  async findActiveByUserId(userId) {
    return Subscription.findOne({
      where: {
        user_id: userId,
        status: 'active',
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: new Date() } },
        ],
      },
      include: [{ model: Plan, as: 'plan' }],
      order: [['created_at', 'DESC']],
    });
  }

  async assignFreePlan(userId) {
    const freePlan = await Plan.findOne({ where: { name: 'free' } });
    if (!freePlan) {
      throw new Error('Plano free não encontrado. Execute o seed de planos.');
    }
    return Subscription.create({
      user_id: userId,
      plan_id: freePlan.id,
      status: 'active',
      starts_at: new Date(),
      expires_at: null,
      payment_provider: 'manual',
    });
  }

  async upgradePlan(userId, planName) {
    const plan = await Plan.findOne({ where: { name: planName, is_active: true } });
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    // Cancela assinatura ativa anterior
    await Subscription.update(
      { status: 'cancelled' },
      { where: { user_id: userId, status: 'active' } }
    );

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    return Subscription.create({
      user_id: userId,
      plan_id: plan.id,
      status: 'active',
      starts_at: new Date(),
      expires_at: plan.name === 'free' ? null : expiresAt,
      payment_provider: 'manual',
    });
  }

  async countTransactionsThisMonth(userId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return Transaction.count({
      where: {
        user_id: userId,
        created_at: { [Op.between]: [startOfMonth, endOfMonth] },
      },
    });
  }

  // Chamado pelo webhook após confirmação de pagamento
  async upgradeByPayment(userId, planName, externalSubscriptionId) {
    const plan = await Plan.findOne({ where: { name: planName, is_active: true } });
    if (!plan) {
      throw new Error(`Plano '${planName}' não encontrado`);
    }

    await Subscription.update(
      { status: 'cancelled' },
      { where: { user_id: userId, status: 'active' } }
    );

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    return Subscription.create({
      user_id: userId,
      plan_id: plan.id,
      status: 'active',
      starts_at: new Date(),
      expires_at: expiresAt,
      payment_provider: 'abacatepay',
      external_subscription_id: externalSubscriptionId,
    });
  }

  async findAllPlans() {
    return Plan.findAll({ where: { is_active: true }, order: [['price_brl', 'ASC']] });
  }
}

module.exports = new SubscriptionRepository();

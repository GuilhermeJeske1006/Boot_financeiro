const { Subscription, Plan, Transaction, User } = require('../models');
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

  async getTransactionLimit(userId) {
    const subscription = await Subscription.findOne({
      where: { user_id: userId, status: 'active' },
    });

    const result = await Plan.findOne({ where: { id: subscription.plan_id } });
    return result?.max_transactions_per_month ?? 50;
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

  // Called by checkout.session.completed webhook
  async upgradeByPayment(userId, planName, stripeSubscriptionId) {
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
      payment_provider: 'stripe',
      external_subscription_id: stripeSubscriptionId,
    });
  }

  // Called by invoice.payment_succeeded webhook for monthly renewals
  // periodEnd: Unix timestamp from invoice.period_end (avoids setMonth month-end edge cases)
  async renewBySubscriptionId(stripeSubscriptionId, periodEnd) {
    const subscription = await Subscription.findOne({
      where: { external_subscription_id: stripeSubscriptionId, status: 'active' },
    });

    if (!subscription) return null;

    const newExpiry = periodEnd
      ? new Date(periodEnd * 1000)
      : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; })();

    return subscription.update({ expires_at: newExpiry });
  }

  // Finds active Stripe subscriptions past their expiry date (for missed webhook recovery)
  async findExpired() {
    return Subscription.findAll({
      where: {
        status: 'active',
        payment_provider: 'stripe',
        expires_at: { [Op.lt]: new Date() },
      },
      include: [
        { model: Plan, as: 'plan' },
        { model: User, as: 'user' },
      ],
    });
  }

  async findAllPlans() {
    return Plan.findAll({ where: { is_active: true }, order: [['price_brl', 'ASC']] });
  }

  async cancelToFreePlan(userId) {
    await Subscription.update(
      { status: 'cancelled' },
      { where: { user_id: userId, status: 'active' } }
    );
    return this.assignFreePlan(userId);
  }
}

module.exports = new SubscriptionRepository();

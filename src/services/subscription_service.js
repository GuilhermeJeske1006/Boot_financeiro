const SubscriptionRepository = require('../repositories/subscription_repository');
const PaymentGateway = require('./payment_gateway');

class SubscriptionService {
  async getMySubscription(userId) {
    const subscription = await SubscriptionRepository.findActiveByUserId(userId);
    if (!subscription) {
      throw new Error('Nenhuma assinatura ativa encontrada');
    }
    return subscription;
  }

  async getAvailablePlans() {
    return SubscriptionRepository.findAllPlans();
  }

  async assignFreePlan(userId) {
    return SubscriptionRepository.assignFreePlan(userId);
  }

  async upgradePlan(userId, planName) {
    const validPlans = ['free', 'pro'];
    if (!validPlans.includes(planName)) {
      throw new Error('Plano inválido. Opções: free, pro');
    }
    return SubscriptionRepository.upgradePlan(userId, planName);
  }

  // Verifica se o usuário pode criar mais uma transação no mês
  async canCreateTransaction(userId) {
    const limit = await SubscriptionRepository.getTransactionLimit(userId);
    if (limit === -1) return true; // ilimitado

    const count = await SubscriptionRepository.countTransactionsThisMonth(userId);
    return count < limit;
  }

  // Verifica se o usuário tem acesso a uma feature do plano
  async hasFeature(userId, feature) {
    const subscription = await SubscriptionRepository.findActiveByUserId(userId);
    if (!subscription) return false;
    return !!subscription.plan[feature];
  }

  async cancelSubscription(userId) {
    const subscription = await SubscriptionRepository.findActiveByUserId(userId);
    if (!subscription) {
      throw new Error('Nenhuma assinatura ativa encontrada');
    }

    if (subscription.plan?.name === 'free') {
      throw new Error('Plano gratuito não pode ser cancelado');
    }

    if (subscription.payment_provider === 'stripe' && subscription.external_subscription_id) {
      // Stripe fires customer.subscription.deleted → webhook downgrades locally
      await PaymentGateway.cancelSubscription(subscription.external_subscription_id);
      return { message: 'Cancelamento solicitado ao Stripe. Você será movido para o plano Grátis em instantes.' };
    }

    // Manual subscription — cancel locally and assign free
    await SubscriptionRepository.cancelToFreePlan(userId);
    return { message: 'Assinatura cancelada. Você foi movido para o plano Grátis.' };
  }

}

module.exports = new SubscriptionService();

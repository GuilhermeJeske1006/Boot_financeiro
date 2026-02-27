const SubscriptionRepository = require('../repositories/subscription_repository');

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
    const validPlans = ['free', 'pro', 'business'];
    if (!validPlans.includes(planName)) {
      throw new Error('Plano inválido. Opções: free, pro, business');
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
}

module.exports = new SubscriptionService();

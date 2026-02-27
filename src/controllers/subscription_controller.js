const SubscriptionService = require('../services/subscription_service');

class SubscriptionController {
  async getMySubscription(req, res) {
    try {
      const subscription = await SubscriptionService.getMySubscription(req.userId);
      return res.json(subscription);
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  }

  async getPlans(req, res) {
    try {
      const plans = await SubscriptionService.getAvailablePlans();
      return res.json(plans);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async upgradePlan(req, res) {
    try {
      const { plan } = req.body;
      if (!plan) {
        return res.status(400).json({ error: 'Campo "plan" é obrigatório (free, pro, business)' });
      }
      const subscription = await SubscriptionService.upgradePlan(req.userId, plan);
      return res.json({ message: 'Plano atualizado com sucesso', subscription });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new SubscriptionController();

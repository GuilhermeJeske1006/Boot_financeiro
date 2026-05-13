const Stripe = require('stripe');
const UserRepository = require('../../repositories/user_respository');

class StripeGateway {
  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not set');
    }
  }

  get client() {
    if (!this._client) {
      this._client = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return this._client;
  }

  async getOrCreateCustomer(user) {
    if (user.stripe_customer_id) return user.stripe_customer_id;

    const customer = await this.client.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: String(user.id) },
    });

    await UserRepository.update(user.id, { stripe_customer_id: customer.id });
    return customer.id;
  }

  async createCheckoutSession(user, plan) {
    if (!user.email) throw new Error('Usuário precisa de e-mail para assinar.');

    const customerId = await this.getOrCreateCustomer(user);
    const priceId = this._priceId(plan.name);

    const session = await this.client.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}?payment=success`,
      cancel_url: `${process.env.APP_URL}?payment=cancelled`,
      metadata: { userId: String(user.id), planName: plan.name },
      subscription_data: {
        metadata: { userId: String(user.id), planName: plan.name },
      },
    });

    return session.url;
  }

  // Returns URL for customer to manage subscription, update card, cancel
  async createPortalSession(stripeCustomerId) {
    const session = await this.client.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: process.env.APP_URL,
    });
    return session.url;
  }

  async cancelSubscription(stripeSubscriptionId) {
    return this.client.subscriptions.cancel(stripeSubscriptionId);
  }

  // Throws if signature is invalid — call with raw Buffer body
  verifyWebhookSignature(rawBody, signature) {
    return this.client.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }

  _priceId(planName) {
    const map = { pro: process.env.STRIPE_PRO_PRICE_ID };
    const id = map[planName];
    if (!id) throw new Error(`STRIPE_${planName.toUpperCase()}_PRICE_ID não configurado`);
    return id;
  }
}

module.exports = new StripeGateway();

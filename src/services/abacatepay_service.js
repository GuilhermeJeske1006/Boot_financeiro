const crypto = require('crypto');
const abacatePayRepository = require('../repositories/abacatepay_repository');
const FormatHelper = require('../helpers/format_helper');

class AbacatePayService {
  /**
   * Gera um link de pagamento para upgrade de plano.
   * @param {object} user - { id, name, email, phone }
   * @param {object} plan - { name, display_name, price_brl }
   * @returns {string} URL do link de pagamento
   */
  async createUpgradeLink(user, plan) {
    const priceInCents = Math.round(parseFloat(plan.price_brl) * 100);

    if (!user.email) {
      throw new Error('O usuário precisa ter um e-mail cadastrado para gerar o link de pagamento.');
    }
    if(!user.tax_id) {
        throw new Error('O usuário precisa ter um CPF cadastrado para gerar o link de pagamento.');
    }

    const payload = {
      frequency: 'MULTIPLE_PAYMENTS',
      methods: ['PIX', 'CARD'],
      returnUrl: process.env.APP_URL ,
      completionUrl: process.env.APP_URL,
      products: [
        {
          externalId: `plan:${plan.name}:user:${user.id}`,
          name: `Plano ${plan.display_name} - Gestão Financeira`,
          quantity: 1,
          price: priceInCents,
        },
      ],
      customer: {
        name: user.name,
        email: user.email,
        taxId: FormatHelper.formatTaxId(user.tax_id),
        cellphone: FormatHelper.formatCellphone(user.phone),
      },
    };

    const data = await abacatePayRepository.createBilling(payload);

    const url = data.url ?? data.data?.url;
    if (!url) {
      throw new Error(`Resposta sem URL: ${JSON.stringify(data)}`);
    }

    return url;

    
  }

  /**
   * Verifica a autenticidade do webhook via query string secret.
   */
  verifyWebhookSecret(receivedSecret) {
    const expected = process.env.ABACATEPAY_WEBHOOK_SECRET;
    if (!expected || !receivedSecret) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(receivedSecret), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /**
   * Extrai plan name e user id do externalId do produto.
   * Formato: "plan:pro:user:123"
   * @returns {{ planName: string, userId: number } | null}
   */
  parseProductExternalId(externalId) {
    const match = externalId?.match(/^plan:(\w+):user:(\d+)$/);
    if (!match) return null;
    return { planName: match[1], userId: parseInt(match[2], 10) };
  }
}

module.exports = new AbacatePayService();

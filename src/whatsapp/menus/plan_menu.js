const SubscriptionRepository = require('../../repositories/subscription_repository');
const PaymentGateway = require('../../services/payment_gateway');
const UserRepository = require('../../repositories/user_respository');

class PlanMenu {
  async show(userId) {
    const [subscription, allPlans] = await Promise.all([
      SubscriptionRepository.findActiveByUserId(userId),
      SubscriptionRepository.findAllPlans(),
    ]);

    const currentPlan = subscription?.plan;
    const planName = currentPlan?.name || 'free';
    const displayName = currentPlan?.display_name || 'Grátis';

    let msg = `💳 *Meu Plano*\n\n`;
    msg += `📦 Plano atual: *${displayName}*\n`;

    if (planName === 'free') {
      const [count, limit] = await Promise.all([
        SubscriptionRepository.countTransactionsThisMonth(userId),
        SubscriptionRepository.getTransactionLimit(userId),
      ]);
      msg += `📊 Transações este mês: *${count} / ${limit}*\n\n`;
    } else {
      if (subscription?.expires_at) {
        const dateStr = new Date(subscription.expires_at).toLocaleDateString('pt-BR');
        msg += `📅 Válido até: *${dateStr}* (renovação automática)\n\n`;
      }
    }

    const upgradePlans = allPlans.filter((p) => {
      if (planName === 'free') return p.name === 'pro';
      return false;
    });

    const showManage = planName !== 'free';
    const showCancel = planName !== 'free';
    let optionIndex = 0;

    if (upgradePlans.length > 0) {
      msg += `🚀 *Opções de upgrade:*\n\n`;
      upgradePlans.forEach((plan, index) => {
        optionIndex = index + 1;
        const price = parseFloat(plan.price_brl).toFixed(2).replace('.', ',');
        msg += `*${optionIndex}* ➜ Plano *${plan.display_name}* — R$ ${price}/mês\n`;

        if (plan.name === 'pro') {
          msg += `    ✅ Transações ilimitadas\n`;
          msg += `    ✅ Relatórios WhatsApp automáticos\n`;
          msg += `    ✅ Export PDF e Excel\n\n`;
        }
      });
    } else {
      msg += `🏆 *Você já possui o melhor plano disponível!*\n\n`;
    }

    let manageOptionNumber = null;
    let cancelOptionNumber = null;

    if (showManage) {
      manageOptionNumber = ++optionIndex;
      msg += `*${manageOptionNumber}* ➜ Gerenciar assinatura / atualizar cartão 💳\n`;
    }

    if (showCancel) {
      cancelOptionNumber = ++optionIndex;
      msg += `*${cancelOptionNumber}* ➜ Cancelar plano ❌\n`;
    }

    msg += `*0* ➜ Voltar ao menu\n`;
    msg += `\n_Digite o número da opção_ ✍️`;

    return { message: msg, upgradePlans, showManage, showCancel, manageOptionNumber, cancelOptionNumber };
  }

  async handleStep(state, input, userId) {
    if (input === '0') {
      return { done: true, message: '' };
    }

    if (state.data.awaitingReturn) {
      return { done: true, message: '' };
    }

    if (state.data.awaitingCancelConfirm) {
      return await this._handleCancelConfirm(state, input, userId);
    }

    if (state.data.awaitingEmail) {
      return await this._handleEmailStep(state, input, userId);
    }

    const {
      upgradePlans = [],
      showManage = false,
      showCancel = false,
      manageOptionNumber,
      cancelOptionNumber,
    } = state.data;

    // Manage subscription (update card, view invoices)
    if (showManage && input === String(manageOptionNumber)) {
      return await this._generatePortalLink(userId);
    }

    // Cancel confirmation
    if (showCancel && input === String(cancelOptionNumber)) {
      return {
        newState: { ...state, data: { ...state.data, awaitingCancelConfirm: true } },
        message:
          `⚠️ *Cancelar plano*\n\n` +
          `Tem certeza que deseja cancelar seu plano?\n` +
          `Você voltará para o plano *Grátis* imediatamente.\n\n` +
          `*1* ➜ Sim, cancelar\n` +
          `*2* ➜ Não, manter plano\n\n` +
          `_Digite o número da opção_ ✍️`,
      };
    }

    const index = parseInt(input) - 1;

    if (isNaN(index) || index < 0 || index >= upgradePlans.length) {
      const result = await this.show(userId);
      return {
        newState: { ...state, data: result },
        message: `⚠️ Opção inválida.\n\n${result.message}`,
      };
    }

    const selectedPlan = upgradePlans[index];
    const user = await UserRepository.findById(userId);

    if (!user.email) {
      return {
        newState: { ...state, data: { ...state.data, selectedPlan, awaitingEmail: true } },
        message: `📧 Para gerar o link de pagamento, precisamos do seu *e-mail*.\n\nDigite seu e-mail:`,
      };
    }

    return await this._generatePaymentLink(state, user, selectedPlan);
  }

  async _handleEmailStep(state, input, userId) {
    const email = input.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return {
        newState: state,
        message: `⚠️ E-mail inválido.\n\nDigite um e-mail válido (ex: nome@dominio.com):`,
      };
    }

    const existing = await UserRepository.findByEmail(email);
    if (existing && existing.id !== userId) {
      return {
        newState: state,
        message: `⚠️ Este e-mail já está sendo usado por outra conta.\n\nDigite um e-mail diferente:`,
      };
    }

    await UserRepository.update(userId, { email });
    const user = await UserRepository.findById(userId);

    return await this._generatePaymentLink(state, user, state.data.selectedPlan);
  }

  async _handleCancelConfirm(state, input, userId) {
    if (input === '1') {
      try {
        const subscription = await SubscriptionRepository.findActiveByUserId(userId);

        if (subscription?.payment_provider === 'stripe' && subscription?.external_subscription_id) {
          // Stripe fires customer.subscription.deleted → webhook handles local downgrade
          await PaymentGateway.cancelSubscription(subscription.external_subscription_id);
          return {
            done: true,
            message: `✅ *Cancelamento solicitado!*\n\nSua assinatura será encerrada e você receberá uma confirmação em instantes.`,
          };
        }

        // Manual subscription — cancel locally
        await SubscriptionRepository.cancelToFreePlan(userId);
        return {
          done: true,
          message: `✅ *Plano cancelado com sucesso!*\n\nVocê foi movido para o plano *Grátis*.\nSuas transações existentes foram mantidas.`,
        };
      } catch (error) {
        console.error('Erro ao cancelar plano:', error);
        return {
          newState: state,
          message: `❌ Não foi possível cancelar o plano. Tente novamente em instantes.`,
        };
      }
    }

    const result = await this.show(userId);
    return {
      newState: { ...state, data: result },
      message: result.message,
    };
  }

  async _generatePaymentLink(state, user, selectedPlan) {
    try {
      const url = await PaymentGateway.createCheckoutSession(user, selectedPlan);
      const price = parseFloat(selectedPlan.price_brl).toFixed(2).replace('.', ',');
      const fullMsg = [
        `🔗 *Link de pagamento gerado!*`,
        ``,
        `📦 Plano *${selectedPlan.display_name}* — R$ ${price}/mês`,
        `💳 Pagamento via cartão de crédito com renovação automática`,
        ``,
        url,
        ``,
        `✅ Após o pagamento, seu plano será ativado automaticamente e você receberá uma confirmação aqui no WhatsApp!`,
        ``,
        `*0* ➜ Voltar ao menu`,
        ``,
        `_Digite 0 para continuar_ ✍️`,
      ].join('\n');

      return {
        newState: { ...state, data: { awaitingReturn: true } },
        message: fullMsg,
      };
    } catch (error) {
      console.error('Erro ao gerar link de pagamento:', error);
      return {
        newState: state,
        message: `❌ Não foi possível gerar o link de pagamento. Tente novamente em instantes.`,
      };
    }
  }

  async _generatePortalLink(userId) {
    try {
      const user = await UserRepository.findById(userId);
      if (!user?.stripe_customer_id) {
        return {
          done: true,
          message: `ℹ️ Nenhuma assinatura ativa encontrada para gerenciar.`,
        };
      }

      const url = await PaymentGateway.createPortalSession(user.stripe_customer_id);
      return {
        newState: null,
        done: true,
        message: [
          `🔗 *Portal de assinatura*`,
          ``,
          `Acesse o link abaixo para gerenciar sua assinatura, atualizar o cartão ou ver faturas:`,
          ``,
          url,
        ].join('\n'),
      };
    } catch (error) {
      console.error('Erro ao gerar portal:', error);
      return {
        done: true,
        message: `❌ Não foi possível acessar o portal. Tente novamente em instantes.`,
      };
    }
  }
}

module.exports = new PlanMenu();

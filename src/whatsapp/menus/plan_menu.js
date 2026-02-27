const SubscriptionRepository = require('../../repositories/subscription_repository');
const AbacatePayService = require('../../services/abacatepay_service');
const UserRepository = require('../../repositories/user_respository');

class PlanMenu {
  // Monta e retorna a tela de "Meu Plano"
  async show(userId) {
    const [subscription, allPlans] = await Promise.all([
      SubscriptionRepository.findActiveByUserId(userId),
      SubscriptionRepository.findAllPlans(),
    ]);

    const currentPlan = subscription?.plan;
    const planName = currentPlan?.name || 'free';
    const displayName = currentPlan?.display_name || 'Grátis';

    let msg = `💳 *Meu Plano*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `📦 Plano atual: *${displayName}*\n`;

    if (planName === 'free') {
      const count = await SubscriptionRepository.countTransactionsThisMonth(userId);
      const limit = currentPlan?.max_transactions_per_month ?? 50;
      msg += `📊 Transações este mês: *${count} / ${limit}*\n\n`;
    } else {
      if (subscription?.expires_at) {
        const dateStr = new Date(subscription.expires_at).toLocaleDateString('pt-BR');
        msg += `📅 Válido até: *${dateStr}*\n\n`;
      }
    }

    // Planos disponíveis para upgrade com base no plano atual
    const upgradePlans = allPlans.filter((p) => {
      if (planName === 'free') return p.name !== 'free';
      if (planName === 'pro') return p.name === 'business';
      return false; // business não tem upgrade
    });

    const showCancel = planName !== 'free';
    const cancelOptionNumber = upgradePlans.length + 1;

    if (upgradePlans.length > 0) {
      msg += `🚀 *Opções de upgrade:*\n\n`;
      upgradePlans.forEach((plan, index) => {
        const price = parseFloat(plan.price_brl).toFixed(2).replace('.', ',');
        msg += `*${index + 1}* ➜ Plano *${plan.display_name}* — R$ ${price}/mês\n`;

        if (plan.name === 'pro') {
          msg += `    ✅ Transações ilimitadas\n`;
          msg += `    ✅ Relatórios WhatsApp automáticos\n`;
          msg += `    ✅ Export PDF e Excel\n\n`;
        } else if (plan.name === 'business') {
          msg += `    ✅ Tudo do Pro\n`;
          msg += `    ✅ Empresas ilimitadas\n`;
          msg += `    ✅ Multi-usuário por empresa\n\n`;
        }
      });
    } else {
      msg += `🏆 *Você já possui o melhor plano disponível!*\n\n`;
    }

    if (showCancel) {
      msg += `*${cancelOptionNumber}* ➜ Cancelar plano ❌\n`;
    }

    msg += `*0* ➜ Voltar ao menu\n`;
    msg += `\n_Digite o número da opção_ ✍️`;

    return { message: msg, upgradePlans, showCancel, cancelOptionNumber };
  }

  async handleStep(state, input, userId) {
    if (input === '0') {
      return { done: true, message: '' };
    }

    // Etapa: link gerado, aguardando retorno ao menu
    if (state.data.awaitingReturn) {
      return { done: true, message: '' };
    }

    // Etapa: aguardando confirmação de cancelamento
    if (state.data.awaitingCancelConfirm) {
      return await this._handleCancelConfirm(state, input, userId);
    }

    // Etapa: aguardando e-mail do usuário
    if (state.data.awaitingEmail) {
      return await this._handleEmailStep(state, input, userId);
    }

    // Etapa: aguardando CPF/CNPJ do usuário
    if (state.data.awaitingCpf) {
      return await this._handleCpfStep(state, input, userId);
    }

    // Etapa 1: seleção do plano/ação
    const upgradePlans = state.data.upgradePlans || [];
    const showCancel = state.data.showCancel ?? false;
    const cancelOptionNumber = state.data.cancelOptionNumber ?? upgradePlans.length + 1;
    const index = parseInt(input) - 1;

    // Verificar se é opção de cancelamento
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

    if (isNaN(index) || index < 0 || index >= upgradePlans.length) {
      const { message, upgradePlans: plans, showCancel: sc, cancelOptionNumber: cn } = await this.show(userId);
      return {
        newState: { ...state, data: { upgradePlans: plans, showCancel: sc, cancelOptionNumber: cn } },
        message: `⚠️ Opção inválida.\n\n${message}`,
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

    if (!user.tax_id) {
      return {
        newState: { ...state, data: { ...state.data, selectedPlan, awaitingCpf: true } },
        message: `📋 Para gerar o link de pagamento, precisamos do seu *CPF ou CNPJ*.\n\nDigite apenas os números:`,
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

    await UserRepository.update(userId, { email });
    const user = await UserRepository.findById(userId);

    if (!user.tax_id) {
      return {
        newState: { ...state, data: { ...state.data, awaitingEmail: false, awaitingCpf: true } },
        message: `📋 Para gerar o link de pagamento, precisamos do seu *CPF ou CNPJ*.\n\nDigite apenas os números:`,
      };
    }

    return await this._generatePaymentLink(state, user, state.data.selectedPlan);
  }

  async _handleCpfStep(state, input, userId) {
    const digits = input.replace(/\D/g, '');

    if (digits.length !== 11 && digits.length !== 14) {
      return {
        newState: state,
        message: `⚠️ CPF ou CNPJ inválido.\n\nDigite apenas os números:\n• CPF: 11 dígitos\n• CNPJ: 14 dígitos`,
      };
    }

    await UserRepository.update(userId, { tax_id: digits });
    const user = await UserRepository.findById(userId);

    return await this._generatePaymentLink(state, user, state.data.selectedPlan);
  }

  async _handleCancelConfirm(state, input, userId) {
    if (input === '1') {
      try {
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

    // Qualquer outra opção volta ao menu de planos
    const { message, upgradePlans, showCancel, cancelOptionNumber } = await this.show(userId);
    return {
      newState: { ...state, data: { upgradePlans, showCancel, cancelOptionNumber } },
      message,
    };
  }

  async _generatePaymentLink(state, user, selectedPlan) {
    try {
      const link = await AbacatePayService.createUpgradeLink(user, selectedPlan);
      const price = parseFloat(selectedPlan.price_brl).toFixed(2).replace('.', ',');
      const msg = [
        `🔗 *Link de pagamento gerado!*`,
        ``,
        `📦 Plano *${selectedPlan.display_name}* — R$ ${price}/mês`,
        ``,
        link,
        ``,
        `✅ Após o pagamento, seu plano será ativado automaticamente e você receberá uma confirmação aqui no WhatsApp!`,
      ].join('\n');
      const fullMsg = msg + `\n\n*0* ➜ Voltar ao menu\n\n_Digite 0 para continuar_ ✍️`;
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
}

module.exports = new PlanMenu();

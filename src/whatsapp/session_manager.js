const MainMenu = require('./menus/main_menu');
const TransactionMenu = require('./menus/transaction_menu');
const CompanyMenu = require('./menus/company_menu');
const ReportMenu = require('./menus/report_menu');
const PlanMenu = require('./menus/plan_menu');
const RecurringTransactionMenu = require('./menus/recurring_transaction_menu');
const ExportMenu = require('./menus/export_menu');
const ProfileMenu = require('./menus/profile_menu');
const BudgetMenu = require('./menus/budget_menu');
const CompanyService = require('../services/company_service');
const SubscriptionService = require('../services/subscription_service');

class SessionManager {
  constructor() {
    // Map de sessões por telefone: phone -> { flow, step, data, context }
    // context: 'PF' | 'PJ' | null
    //   'PF' = usuário escolheu modo Pessoa Física nesta sessão
    //   'PJ' = usuário escolheu modo Empresa nesta sessão
    //   null = usuário não tem empresa cadastrada
    //   undefined = contexto ainda não definido (vai perguntar PF/PJ)
    this.sessions = new Map();
  }

  _getSession(phone) {
    if (!this.sessions.has(phone)) {
      this.sessions.set(phone, { flow: 'main', step: 0, data: {} });
    }
    return this.sessions.get(phone);
  }

  // Ao voltar para o menu principal, preserva o contexto (PF/PJ) da sessão
  _resetToMain(phone) {
    const existing = this.sessions.get(phone);
    const context = existing ? existing.context : undefined;
    this.sessions.set(phone, { flow: 'main', step: 0, data: {}, context });
  }

  // Chamado pelo webhook após confirmação de pagamento
  resetSession(phone) {
    this.sessions.delete(phone);
  }

  // Chamado pelo handler.js após o cadastro para inicializar o contexto
  initSession(phone, context) {
    this.sessions.set(phone, { flow: 'main', step: 0, data: {}, context });
  }

  _buildContextQuestion() {
    return (
      `🎯 Esta sessão é para:\n\n` +
      `👤 *1* ➜ Pessoa Física\n` +
      `🏢 *2* ➜ Empresa\n\n` +
      `_Digite 1 ou 2_ ✍️`
    );
  }

  async processInput(phone, userId, input) {
    // Opção "sair" para finalizar a sessão
    if (input.toLowerCase() === 'sair') {
      this.sessions.delete(phone);
      return `🔚 Sessão finalizada.\n\nObrigado por usar o *Bot Financeiro*! 👋\n\nPara iniciar novamente, envie qualquer mensagem.`;
    }

    // Ao digitar "menu" ou "0" no fluxo principal, reinicia e pergunta PF/PJ novamente se tiver empresa
    if (input.toLowerCase() === 'menu' || input === '0') {
      const state = this._getSession(phone);
      // Se estiver no menu principal (flow: 'main'), sai do sistema
      if (state.flow === 'main') {
        this.sessions.delete(phone);
        return `🔚 Sessão finalizada.\n\nObrigado por usar o *Bot Financeiro*! 👋\n\nPara iniciar novamente, envie qualquer mensagem.`;
      }
      // Caso contrário, volta para o menu principal
      const companies = await CompanyService.findByUserId(userId);
      if (companies.length > 0) {
        this.sessions.set(phone, { flow: 'choose_context', step: 1, data: {} });
        return this._buildContextQuestion();
      }
      this.sessions.set(phone, { flow: 'main', step: 0, data: {}, context: null });
      return await MainMenu.show(userId);
    }

    // Se não há sessão ativa, verifica se precisa selecionar PF/PJ
    if (!this.sessions.has(phone)) {
      const companies = await CompanyService.findByUserId(userId);
      if (companies.length > 0) {
        this.sessions.set(phone, { flow: 'choose_context', step: 1, data: {} });
        return this._buildContextQuestion();
      }
      this.sessions.set(phone, { flow: 'main', step: 0, data: {}, context: null });
    }

    const state = this._getSession(phone);

    try {
      switch (state.flow) {
        case 'choose_context':
          return await this._handleChooseContext(phone, userId, input);
        case 'main':
          return await this._handleMainMenu(phone, userId, input);
        case 'add_income':
        case 'add_expense':
          return await this._handleTransactionFlow(phone, userId, input);
        case 'manage_companies':
          return await this._handleCompanyFlow(phone, userId, input);
        case 'report':
          return await this._handleReportFlow(phone, userId, input);
        case 'plans':
          return await this._handlePlanFlow(phone, userId, input);
        case 'recurring_transactions':
          return await this._handleRecurringTransactionFlow(phone, userId, input);
        case 'export':
          return await this._handleExportFlow(phone, userId, input);
        case 'edit_profile':
          return await this._handleProfileFlow(phone, userId, input);
        case 'budgets':
          return await this._handleBudgetFlow(phone, userId, input);
        default:
          this._resetToMain(phone);
          return await MainMenu.show(userId);
      }
    } catch (error) {
      console.error('Erro no session manager:', error.message);
      this._resetToMain(phone);
      return `❌ Ocorreu um erro: ${error.message}\n\nDigite *menu* para voltar ao menu principal.`;
    }
  }

  async _handleChooseContext(phone, userId, input) {
    if (input === '1') {
      this.sessions.set(phone, { flow: 'main', step: 0, data: {}, context: 'PF' });
      return await MainMenu.show(userId);
    } else if (input === '2') {
      this.sessions.set(phone, { flow: 'main', step: 0, data: {}, context: 'PJ' });
      return await MainMenu.show(userId);
    } else {
      return '⚠️ Por favor, digite *1* para Pessoa Física ou *2* para Empresa.';
    }
  }

  async _handleMainMenu(phone, userId, input) {
    const state = this._getSession(phone);
    let context = state.context;

    // Se o contexto ainda não foi definido, verifica se o usuário tem empresa
    if (context === undefined) {
      const companies = await CompanyService.findByUserId(userId);
      if (companies.length > 0) {
        this.sessions.set(phone, { flow: 'choose_context', step: 1, data: {} });
        return this._buildContextQuestion();
      }
      context = null;
      this.sessions.set(phone, { ...state, context: null });
    }


    switch (input) {
      case '1':
        return await this._startTransactionFlow(phone, userId, 'income', context);
      case '2':
        return await this._startTransactionFlow(phone, userId, 'expense', context);
      case '3': {
        const hasFeature = await SubscriptionService.hasFeature(userId, 'recurring_transactions');
        if (!hasFeature) {
          return (
            `🔒 *Funcionalidade exclusiva dos planos Pro e Business*\n\n` +
            `Para usar Transações Recorrentes, faça upgrade do seu plano.\n\n` +
            `Digite *8* para ver os planos disponíveis.`
          );
        }
        this.sessions.set(phone, { flow: 'recurring_transactions', step: 1, data: {}, context });
        return RecurringTransactionMenu.showMainMenu();
      }
      case '4':
        return await this._handleMonthlyReport(phone, userId, context);
      case '5': {
        const hasExport = await SubscriptionService.hasFeature(userId, 'pdf_export');
        if (!hasExport) {
          return (
            `🔒 *Funcionalidade exclusiva dos planos Pro e Business*\n\n` +
            `Para exportar relatórios em PDF ou Excel, faça upgrade do seu plano.\n\n` +
            `Digite *8* para ver os planos disponíveis.`
          );
        }
        this.sessions.set(phone, { flow: 'export', step: 1, data: {}, context });
        return ExportMenu.showMenu();
      }
      case '6': {
        const hasBudgets = await SubscriptionService.hasFeature(userId, 'category_budgets');
        if (!hasBudgets) {
          return (
            `🔒 *Funcionalidade exclusiva dos planos Pro e Business*\n\n` +
            `Para usar Metas e Orçamentos por categoria, faça upgrade do seu plano.\n\n` +
            `Digite *8* para ver os planos disponíveis.`
          );
        }
        const { message, budgets } = await BudgetMenu.showMain(userId);
        this.sessions.set(phone, { flow: 'budgets', step: 1, data: { budgets }, context });
        return message;
      }
      case '7':
        this.sessions.set(phone, { flow: 'manage_companies', step: 1, data: {}, context });
        return await CompanyMenu.showMenu(userId);
      case '8': {
        const { message, upgradePlans, showCancel, cancelOptionNumber } = await PlanMenu.show(userId);
        this.sessions.set(phone, { flow: 'plans', step: 1, data: { upgradePlans, showCancel, cancelOptionNumber }, context });
        return message;
      }
      case '9': {
        const { message } = await ProfileMenu.showProfile(userId);
        this.sessions.set(phone, { flow: 'edit_profile', step: 1, data: {}, context });
        return message;
      }
      case '0':
        this.sessions.delete(phone);
        return `🔚 Sessão finalizada.\n\nObrigado por usar o *Bot Financeiro*! 👋\n\nPara iniciar novamente, envie qualquer mensagem.`;
      default:
        return await MainMenu.show(userId);
    }
  }

  async _handleMonthlyReport(phone, userId, context) {
    if (context === 'PJ') {
      const companies = await CompanyService.findByUserId(userId);

      if (companies.length === 0) {
        return '⚠️ Você não possui empresas cadastradas.';
      }

      let msg = `🏢 Escolha a empresa para o relatório:\n\n`;
      companies.forEach((company, index) => {
        msg += `  📊 *${index + 1}* ➜ ${company.name}\n`;
      });
      msg += `\n_Digite o número da empresa_ ✍️`;

      this.sessions.set(phone, {
        flow: 'report',
        step: 2,
        data: { is_personal: false, companies },
        context,
      });
      return msg;
    }

    // PF ou null: vai direto para a pergunta do mês (step 3)
    this.sessions.set(phone, {
      flow: 'report',
      step: 3,
      data: { is_personal: true },
      context,
    });
    return ReportMenu.askMonth();
  }


  async _startTransactionFlow(phone, userId, type, context) {
    const canCreate = await SubscriptionService.canCreateTransaction(userId);
    if (!canCreate) {
      const { message: planMsg, upgradePlans, showCancel, cancelOptionNumber } = await PlanMenu.show(userId);
      this.sessions.set(phone, {
        flow: 'plans',
        step: 1,
        data: { upgradePlans, showCancel, cancelOptionNumber },
        context,
      });
      return [
        '🚫 *Limite do plano gratuito atingido!*',
        '',
        'Você utilizou todas as transações gratuitas deste mês.',
        'Para continuar registrando novas transações, faça upgrade do seu plano:',
        '',
        planMsg,
      ].join('\n');
    }

    const flow = type === 'income' ? 'add_income' : 'add_expense';

    if (context === 'PF' || context === null) {
      // Pessoa Física ou sem empresa: pula seleção PF/PJ, vai direto para categorias (step 2)
      this.sessions.set(phone, {
        flow,
        step: 2,
        data: { type, is_personal: true },
        context,
      });
    } else if (context === 'PJ') {
      // Empresa: pula seleção PF/PJ, vai direto para seleção de empresa (step 2)
      const companies = await CompanyService.findByUserId(userId);
      this.sessions.set(phone, {
        flow,
        step: 2,
        data: { type, is_personal: false, companies },
        context,
      });
    } else {
      // Fallback (sem contexto): usa fluxo original com seleção PF/PJ
      this.sessions.set(phone, { flow, step: 1, data: { type }, context });
    }

    return await TransactionMenu.startFlow(type, userId, context);
  }

  async _handleTransactionFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await TransactionMenu.handleStep(state, input, userId);
    if (result.done) {
      if (result.planLimitReached) {
        const { message: planMsg, upgradePlans, showCancel, cancelOptionNumber } = await PlanMenu.show(userId);
        this.sessions.set(phone, {
          flow: 'plans',
          step: 1,
          data: { upgradePlans, showCancel, cancelOptionNumber },
          context: state.context,
        });
        return [
          result.message,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━',
          '🚫 *Limite do plano gratuito atingido!*',
          '',
          'Você utilizou todas as transações gratuitas deste mês.',
          'Para continuar registrando, faça upgrade do seu plano:',
          '',
          planMsg,
        ].join('\n');
      }
      this._resetToMain(phone);
      return result.message + '\n\n' + await MainMenu.show(userId);
    }
    // Preserva o context ao atualizar o estado interno do fluxo
    this.sessions.set(phone, { ...result.newState, context: state.context });
    return result.message;
  }

  async _handleReportFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await ReportMenu.handleStep(state, input, userId);
    if (result.done) {
      this._resetToMain(phone);
      return result.message + '\n\n' + await MainMenu.show(userId);
    }
    this.sessions.set(phone, { ...result.newState, context: state.context });
    return result.message;
  }

  async _handlePlanFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await PlanMenu.handleStep(state, input, userId);

    if (result.done) {
      this._resetToMain(phone);
      const mainMenu = await MainMenu.show(userId);
      return result.message ? `${result.message}\n\n${mainMenu}` : mainMenu;
    }

    this.sessions.set(phone, { ...result.newState, context: state.context });
    return result.message;
  }

  async _handleRecurringTransactionFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await RecurringTransactionMenu.handleStep(state, input, userId);

    if (result.done) {
      this._resetToMain(phone);
      const mainMenu = await MainMenu.show(userId);
      return result.message ? `${result.message}\n\n${mainMenu}` : mainMenu;
    }

    this.sessions.set(phone, { ...result.newState, context: state.context });
    return result.message;
  }

  async _handleExportFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await ExportMenu.handleStep(state, input, userId);

    if (result.done) {
      this._resetToMain(phone);
      const mainMenu = await MainMenu.show(userId);

      if (result.media) {
        return {
          media: result.media,
          text: result.message ? `${result.message}\n\n${mainMenu}` : mainMenu,
        };
      }

      return result.message ? `${result.message}\n\n${mainMenu}` : mainMenu;
    }

    this.sessions.set(phone, { ...result.newState, context: state.context });
    return result.message;
  }

  async _handleProfileFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await ProfileMenu.handleStep(state, input, userId);

    if (result.done) {
      this._resetToMain(phone);
      const mainMenu = await MainMenu.show(userId);
      return result.message ? `${result.message}\n\n${mainMenu}` : mainMenu;
    }

    this.sessions.set(phone, { ...result.newState, context: state.context });
    return result.message;
  }

  async _handleBudgetFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await BudgetMenu.handleStep(state, input, userId);

    if (result.done) {
      this._resetToMain(phone);
      const mainMenu = await MainMenu.show(userId);
      return result.message ? `${result.message}\n\n${mainMenu}` : mainMenu;
    }

    this.sessions.set(phone, { ...result.newState, context: state.context });
    return result.message;
  }

  async _handleCompanyFlow(phone, userId, input) {
    const state = this._getSession(phone);

    if (state.step === 1 && !state.data.flow) {
      const option = input.trim();
      if (option === '0') {
        this._resetToMain(phone);
        return await MainMenu.show(userId);
      }

      const companies = await CompanyService.findByUserId(userId);

      if (option === '1') {
        const canAdd = await SubscriptionService.canAddCompany(userId);
        if (!canAdd) {
          return `🔒 *Funcionalidade exclusiva do plano Business*\n\nPara cadastrar empresas, faça upgrade para o plano Business.\n\nDigite *0* para voltar ao menu.`;
        }
        this.sessions.set(phone, { flow: 'manage_companies', step: 2, data: { flow: 'create', step: 1 }, context: state.context });
        const result = await CompanyMenu.startCreateFlow();
        return result.message;
      } else if (option === '2' && companies.length > 0) {
        this.sessions.set(phone, { flow: 'manage_companies', step: 2, data: { flow: 'view', step: 1 }, context: state.context });
        return '📋 Digite o número da empresa que deseja ver:';
      } else if (option === '3' && companies.length > 0) {
        this.sessions.set(phone, { flow: 'manage_companies', step: 2, data: { flow: 'edit', step: 1 }, context: state.context });
        return '✏️ Digite o número da empresa que deseja editar:';
      } else if (option === '4' && companies.length > 0) {
        this.sessions.set(phone, { flow: 'manage_companies', step: 2, data: { flow: 'delete', step: 1 }, context: state.context });
        return '🗑️ Digite o número da empresa que deseja excluir:';
      } else {
        return await CompanyMenu.showMenu(userId);
      }
    }

    const result = await CompanyMenu.handleStep(state.data, input, userId);
    if (result.done) {
      this._resetToMain(phone);
      return result.message + '\n\n' + await MainMenu.show(userId);
    }
    this.sessions.set(phone, { flow: 'manage_companies', step: state.step + 1, data: result.newState, context: state.context });
    return result.message;
  }
}

module.exports = new SessionManager();

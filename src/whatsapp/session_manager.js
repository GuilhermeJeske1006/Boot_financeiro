const MainMenu = require('./menus/main_menu');
const TransactionMenu = require('./menus/transaction_menu');
const ReportMenu = require('./menus/report_menu');
const PlanMenu = require('./menus/plan_menu');
const RecurringTransactionMenu = require('./menus/recurring_transaction_menu');
const ExportMenu = require('./menus/export_menu');
const ProfileMenu = require('./menus/profile_menu');
const BudgetMenu = require('./menus/budget_menu');
const EditTransactionMenu = require('./menus/edit_transaction_menu');
const GoalMenu = require('./menus/goal_menu');
const LLMMenu = require('./menus/llm_menu');
const RecentTransactionsMenu = require('./menus/recent_transactions_menu');
const SubscriptionService = require('../services/subscription_service');
const AiInterpreter = require('./services/ai_interpreter');
const AgentOrchestrator = require('./ai/agent_orchestrator');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    setInterval(() => this._cleanupStaleSessions(), 30 * 60 * 1000);
  }

  _getSession(phone) {
    if (!this.sessions.has(phone)) {
      this.sessions.set(phone, { flow: 'main', step: 0, data: {}, lastActivity: Date.now() });
    } else {
      this.sessions.get(phone).lastActivity = Date.now();
    }
    return this.sessions.get(phone);
  }

  _resetToMain(phone) {
    this.sessions.set(phone, { flow: 'main', step: 0, data: {}, lastActivity: Date.now() });
  }

  resetSession(phone) {
    this.sessions.delete(phone);
  }

  initSession(phone) {
    this.sessions.set(phone, { flow: 'main', step: 0, data: {}, lastActivity: Date.now() });
  }

  _cleanupStaleSessions() {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const [phone, session] of this.sessions) {
      if ((session.lastActivity || 0) < cutoff) {
        this.sessions.delete(phone);
        AiInterpreter.clearContext(phone);
      }
    }
  }


  _buildModeQuestion() {
    return (
      `👋 Olá! Como você prefere interagir hoje?\n\n` +
      `💬 *1* ➜ Chat — escreva em linguagem natural (via IA)\n` +
      `🤖 *2* ➜ Bot — menus interativos\n\n` +
      `_Digite 1 ou 2_ ✍️`
    );
  }

  _buildChatWelcome() {
    return (
      `💬 *Modo Chat ativado!*\n\n` +
      `Escreva ou envie um 🎤 *áudio* em linguagem natural. Exemplos:\n\n` +
      `• _"Gastei 50 reais no mercado"_\n` +
      `• _"Recebi 3000 de salário"_\n` +
      `• _"Qual meu saldo?"_\n\n` +
      `_Digite *menu* para voltar ao modo bot ou *sair* para encerrar._`
    );
  }

  isInChatMode(phone) {
    const session = this.sessions.get(phone);
    return session ? session.flow === 'chat' : false;
  }

  async processInput(phone, userId, input) {
    if (input.toLowerCase() === 'sair') {
      this.sessions.delete(phone);
      return `🔚 Sessão finalizada.\n\nObrigado por usar o *Bot Financeiro*! 👋\n\nPara iniciar novamente, envie qualquer mensagem.`;
    }

    if (input.toLowerCase() === 'menu' || input === '0') {
      const state = this._getSession(phone);
      if (state.flow === 'main') {
        this.sessions.delete(phone);
        return `🔚 Sessão finalizada.\n\nObrigado por usar o *Bot Financeiro*! 👋\n\nPara iniciar novamente, envie qualquer mensagem.`;
      }
      this.sessions.set(phone, { flow: 'choose_mode', step: 1, data: {} });
      return this._buildModeQuestion();
    }

    if (!this.sessions.has(phone)) {
      this.sessions.set(phone, { flow: 'choose_mode', step: 1, data: {} });
      return this._buildModeQuestion();
    }

    const state = this._getSession(phone);

    try {
      switch (state.flow) {
        case 'choose_mode':
          return await this._handleChooseMode(phone, userId, input);
        case 'chat':
          return await this._handleChatFlow(phone, userId, input);
        case 'main':
          return await this._handleMainMenu(phone, userId, input);
        case 'add_income':
        case 'add_expense':
          return await this._handleTransactionFlow(phone, userId, input);
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
        case 'edit_transaction':
          return await this._handleEditTransactionFlow(phone, userId, input);
        case 'goals':
          return await this._handleGoalFlow(phone, userId, input);
        case 'llm_settings':
          return await this._handleLLMFlow(phone, userId, input);
        case 'recent_transactions':
          return await this._handleRecentTransactionsFlow(phone, userId);
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

  async _handleChooseMode(phone, userId, input) {
    if (input === '1') {
      const hasAiChat = await SubscriptionService.hasFeature(userId, 'ai_chat');
      if (!hasAiChat) {
        return (
          `🔒 *Funcionalidade exclusiva dos planos Pro *\n\n` +
          `O modo Chat via IA não está disponível no plano gratuito.\n\n` +
          `Digite *10* no menu do bot para ver os planos disponíveis.\n\n` +
          `_Digite *2* para usar o bot com menus._`
        );
      }
      this.sessions.set(phone, { flow: 'chat', step: 1, data: {} });
      return this._buildChatWelcome();
    } else if (input === '2') {
      this.sessions.set(phone, { flow: 'main', step: 0, data: {} });
      return await MainMenu.show(userId);
    } else {
      return '⚠️ Por favor, digite *1* para Chat ou *2* para Bot.';
    }
  }

  async _handleChatFlow(phone, userId, input) {
    if (input.toLowerCase() === 'trocar') {
      this.sessions.set(phone, { flow: 'choose_mode', step: 1, data: {} });
      return this._buildModeQuestion();
    }

    if (input.toLowerCase() === 'limpar histórico' || input.toLowerCase() === 'limpar historico') {
      await AgentOrchestrator.clearHistory(userId);
      return '🧹 Histórico de conversa apagado. Podemos começar do zero!';
    }

    const response = await AgentOrchestrator.process(userId, input);

    // AgentOrchestrator retorna objeto com __media quando gera PDF/Excel
    if (response && typeof response === 'object' && response.__media) {
      return { media: response.__media, text: response.text };
    }

    return response || (
      `🤖 Não entendi. Tente:\n\n` +
      `• _"Gastei 80 reais em combustível"_\n` +
      `• _"Qual meu saldo?"_\n` +
      `• _"Relatório de maio"_\n\n` +
      `_Digite *menu* para o bot com menus._`
    );
  }

  async _handleMainMenu(phone, userId, input) {
    switch (input) {
      case '1':
        return await this._startTransactionFlow(phone, userId, 'income');
      case '2':
        return await this._startTransactionFlow(phone, userId, 'expense');
      case '3': {
        const { message, transactions } = await EditTransactionMenu.showTransactions(userId);
        if (!transactions || transactions.length === 0) {
          return message + '\n\n' + await MainMenu.show(userId);
        }
        this.sessions.set(phone, { flow: 'edit_transaction', step: 1, data: { transactions } });
        return message;
      }
      case '4': {
        this.sessions.set(phone, { flow: 'recent_transactions', step: 1, data: {} });
        return await RecentTransactionsMenu.show(userId);
      }
      case '5': {
        const hasFeature = await SubscriptionService.hasFeature(userId, 'recurring_transactions');
        if (!hasFeature) {
          return (
            `🔒 *Funcionalidade exclusiva dos planos Pro *\n\n` +
            `Para usar Transações Recorrentes, faça upgrade do seu plano.\n\n` +
            `Digite *10* para ver os planos disponíveis.`
          );
        }
        this.sessions.set(phone, { flow: 'recurring_transactions', step: 1, data: {} });
        return RecurringTransactionMenu.showMainMenu();
      }
      case '6': {
        const hasBudgets = await SubscriptionService.hasFeature(userId, 'category_budgets');
        if (!hasBudgets) {
          return (
            `🔒 *Funcionalidade exclusiva dos planos Pro *\n\n` +
            `Para usar Orçamentos por Categoria, faça upgrade do seu plano.\n\n` +
            `Digite *10* para ver os planos disponíveis.`
          );
        }
        const { message, budgets } = await BudgetMenu.showMain(userId);
        this.sessions.set(phone, { flow: 'budgets', step: 1, data: { budgets } });
        return message;
      }
      case '7': {
        const { message, goals } = await GoalMenu.showMain(userId);
        this.sessions.set(phone, { flow: 'goals', step: 1, data: { goals } });
        return message;
      }
      case '8': {
        this.sessions.set(phone, { flow: 'report', step: 1, data: {} });
        return ReportMenu.askMonth();
      }
      case '9': {
        const hasExport = await SubscriptionService.hasFeature(userId, 'pdf_export');
        if (!hasExport) {
          return (
            `🔒 *Funcionalidade exclusiva dos planos Pro *\n\n` +
            `Para exportar relatórios em PDF ou Excel, faça upgrade do seu plano.\n\n` +
            `Digite *10* para ver os planos disponíveis.`
          );
        }
        this.sessions.set(phone, { flow: 'export', step: 1, data: {} });
        return ExportMenu.showMenu();
      }
      case '10': {
        const { message, upgradePlans, showCancel, cancelOptionNumber } = await PlanMenu.show(userId);
        this.sessions.set(phone, { flow: 'plans', step: 1, data: { upgradePlans, showCancel, cancelOptionNumber } });
        return message;
      }
      case '11': {
        const { message } = await ProfileMenu.showProfile(userId);
        this.sessions.set(phone, { flow: 'edit_profile', step: 1, data: {} });
        return message;
      }
      case '12': {
        const { message } = await LLMMenu.showMain(userId);
        this.sessions.set(phone, { flow: 'llm_settings', step: 1, data: {} });
        return message;
      }
      case '0':
        this.sessions.delete(phone);
        return `🔚 Sessão finalizada.\n\nObrigado por usar o *Bot Financeiro*! 👋\n\nPara iniciar novamente, envie qualquer mensagem.`;
      default:
        return await MainMenu.show(userId);
    }
  }

  async _startTransactionFlow(phone, userId, type) {
    const canCreate = await SubscriptionService.canCreateTransaction(userId);
    if (!canCreate) {
      const { message: planMsg, upgradePlans, showCancel, cancelOptionNumber } = await PlanMenu.show(userId);
      this.sessions.set(phone, {
        flow: 'plans',
        step: 1,
        data: { upgradePlans, showCancel, cancelOptionNumber },
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
    this.sessions.set(phone, { flow, step: 1, data: { type } });
    return await TransactionMenu.startFlow(type, userId);
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
    this.sessions.set(phone, result.newState);
    return result.message;
  }

  async _handleReportFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await ReportMenu.handleStep(state, input, userId);
    if (result.done) {
      this._resetToMain(phone);
      return result.message + '\n\n' + await MainMenu.show(userId);
    }
    this.sessions.set(phone, result.newState);
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

    this.sessions.set(phone, result.newState);
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

    this.sessions.set(phone, result.newState);
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

    this.sessions.set(phone, result.newState);
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

    this.sessions.set(phone, result.newState);
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

    this.sessions.set(phone, result.newState);
    return result.message;
  }

  async _handleEditTransactionFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await EditTransactionMenu.handleStep(state, input, userId);

    if (result.done) {
      this._resetToMain(phone);
      const mainMenu = await MainMenu.show(userId);
      return result.message ? `${result.message}\n\n${mainMenu}` : mainMenu;
    }

    this.sessions.set(phone, result.newState);
    return result.message;
  }

  async _handleGoalFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await GoalMenu.handleStep(state, input, userId);

    if (result.done) {
      this._resetToMain(phone);
      const mainMenu = await MainMenu.show(userId);
      return result.message ? `${result.message}\n\n${mainMenu}` : mainMenu;
    }

    this.sessions.set(phone, result.newState);
    return result.message;
  }

  async _handleLLMFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await LLMMenu.handleStep(state, input, userId);

    if (result.done) {
      this._resetToMain(phone);
      const mainMenu = await MainMenu.show(userId);
      return result.message ? `${result.message}\n\n${mainMenu}` : mainMenu;
    }

    this.sessions.set(phone, result.newState);
    return result.message;
  }

  async _handleRecentTransactionsFlow(phone, userId) {
    this._resetToMain(phone);
    return await MainMenu.show(userId);
  }
}

module.exports = new SessionManager();

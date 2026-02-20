const MainMenu = require('./menus/main_menu');
const TransactionMenu = require('./menus/transaction_menu');
const CategoryMenu = require('./menus/category_menu');
const CompanyMenu = require('./menus/company_menu');
const ReportMenu = require('./menus/report_menu');

class SessionManager {
  constructor() {
    // Map de sessões por telefone: phone -> { flow, step, data }
    this.sessions = new Map();
  }

  _getSession(phone) {
    if (!this.sessions.has(phone)) {
      this.sessions.set(phone, { flow: 'main', step: 0, data: {} });
    }
    return this.sessions.get(phone);
  }

  _resetToMain(phone) {
    this.sessions.set(phone, { flow: 'main', step: 0, data: {} });
  }

  async processInput(phone, userId, input) {
    if (input.toLowerCase() === 'menu' || input === '0') {
      this._resetToMain(phone);
      return await MainMenu.show(userId);
    }

    const state = this._getSession(phone);

    try {
      switch (state.flow) {
        case 'main':
          return await this._handleMainMenu(phone, userId, input);
        case 'add_income':
        case 'add_expense':
          return await this._handleTransactionFlow(phone, userId, input);
        case 'manage_categories':
          return await this._handleCategoryFlow(phone, userId, input);
        case 'manage_companies':
          return await this._handleCompanyFlow(phone, userId, input);
        case 'report':
          return await this._handleReportFlow(phone, userId, input);
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

  async _handleMainMenu(phone, userId, input) {
    switch (input) {
      case '1':
        this.sessions.set(phone, { flow: 'add_income', step: 1, data: { type: 'income' } });
        return TransactionMenu.startFlow('income', userId);
      case '2':
        this.sessions.set(phone, { flow: 'add_expense', step: 1, data: { type: 'expense' } });
        return TransactionMenu.startFlow('expense', userId);
      case '3':
        return await ReportMenu.showCurrentMonthBalance(userId);
      case '4':
        this.sessions.set(phone, { flow: 'report', step: 1, data: {} });
        return ReportMenu.askMonth();
      case '5':
        this.sessions.set(phone, { flow: 'manage_categories', step: 1, data: {} });
        return await CategoryMenu.showOptions();
      case '6':
        this.sessions.set(phone, { flow: 'manage_companies', step: 1, data: {} });
        return await CompanyMenu.showMenu(userId);
      default:
        return await MainMenu.show(userId);
    }
  }

  async _handleTransactionFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await TransactionMenu.handleStep(state, input, userId);
    if (result.done) {
      this._resetToMain(phone);
      return result.message + '\n\n' + await MainMenu.show(userId);
    }
    this.sessions.set(phone, result.newState);
    return result.message;
  }

  async _handleCategoryFlow(phone, userId, input) {
    const state = this._getSession(phone);
    const result = await CategoryMenu.handleStep(state, input, userId);
    if (result.done) {
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

  async _handleCompanyFlow(phone, userId, input) {
    const state = this._getSession(phone);

    if (state.step === 1 && !state.data.flow) {
      const option = input.trim();
      if (option === '0') {
        this._resetToMain(phone);
        return await MainMenu.show(userId);
      }

      const companies = await require('../services/company_service').findByUserId(userId);

      if (option === '1') {
        this.sessions.set(phone, { flow: 'manage_companies', step: 2, data: { flow: 'create', step: 1 } });
        const result = await CompanyMenu.startCreateFlow();
        return result.message;
      } else if (option === '2' && companies.length > 0) {
        this.sessions.set(phone, { flow: 'manage_companies', step: 2, data: { flow: 'view', step: 1 } });
        return '📋 Digite o número da empresa que deseja ver:';
      } else if (option === '3' && companies.length > 0) {
        this.sessions.set(phone, { flow: 'manage_companies', step: 2, data: { flow: 'edit', step: 1 } });
        return '✏️ Digite o número da empresa que deseja editar:';
      } else if (option === '4' && companies.length > 0) {
        this.sessions.set(phone, { flow: 'manage_companies', step: 2, data: { flow: 'delete', step: 1 } });
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
    this.sessions.set(phone, { flow: 'manage_companies', step: state.step + 1, data: result.newState });
    return result.message;
  }
}

module.exports = new SessionManager();

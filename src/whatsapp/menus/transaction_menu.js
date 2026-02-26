const CategoryService = require('../../services/category_service');
const TransactionService = require('../../services/transaction_service');
const CompanyService = require('../../services/company_service');

class TransactionMenu {
  // context: 'PF' | 'PJ' | null | undefined
  //   'PF' ou null → mostra categorias pessoais diretamente (pula seleção PF/PJ)
  //   'PJ'         → mostra lista de empresas diretamente (pula seleção PF/PJ)
  //   undefined    → comportamento original (pergunta PF/PJ se houver empresa)
  async startFlow(type, userId, context = undefined) {
    const label = type === 'income' ? '📈 Entrada' : '📉 Saída';
    const emoji = type === 'income' ? '💚' : '🔴';

    if (context === 'PF' || context === null) {
      const categories = await CategoryService.findByType(type, userId, false);
      let msg = `${label} Pessoal\n\n`;
      msg += `🏷️ Escolha a categoria:\n\n`;
      categories.forEach((cat, index) => {
        msg += `  ${emoji} *${index + 1}* ➜ ${cat.name}\n`;
      });
      msg += `\n_Digite o número da categoria_ ✍️\n`;
      msg += `\n🔙 *0* ➜ Voltar | 🔚 *sair* ➜ Finalizar`;
      return msg;
    }

    if (context === 'PJ') {
      const companies = await CompanyService.findByUserId(userId);
      if (companies.length === 0) {
        return '⚠️ Você não possui empresas cadastradas. Cadastre uma empresa primeiro.';
      }
      let msg = `${label} Empresarial\n\n`;
      msg += `🏢 Selecione a empresa:\n\n`;
      companies.forEach((company, index) => {
        msg += `  📊 *${index + 1}* ➜ ${company.name}\n`;
      });
      msg += `\n_Digite o número da empresa_ ✍️\n`;
      msg += `\n🔙 *0* ➜ Voltar | 🔚 *sair* ➜ Finalizar`;
      return msg;
    }

    // Comportamento original (context === undefined): pergunta PF/PJ se tiver empresa
    const companies = await CompanyService.findByUserId(userId);
    if (companies.length === 0) {
      const categories = await CategoryService.findByType(type, userId, false);
      let msg = `${label}\n\n`;
      msg += `🏷️ Escolha a categoria:\n\n`;
      categories.forEach((cat, index) => {
        msg += `  ${emoji} *${index + 1}* ➜ ${cat.name}\n`;
      });
      msg += `\n_Digite o número da categoria_ ✍️\n`;
      msg += `\n🔙 *0* ➜ Voltar | 🔚 *sair* ➜ Finalizar`;
      return msg;
    }

    let msg = `${label}\n\n`;
    msg += `🎯 Esta transação é:\n\n`;
    msg += `  👤 *1* ➜ Pessoa Física\n`;
    msg += `  🏢 *2* ➜ Empresa\n\n`;
    msg += `_Digite 1 ou 2_ ✍️\n`;
    msg += `\n🔙 *0* ➜ Voltar | 🔚 *sair* ➜ Finalizar`;
    return msg;
  }

  async handleStep(state, input, userId) {
    // Opção sair em qualquer etapa
    if (input.toLowerCase() === 'sair') {
      return { done: true, message: '🔚 Operação cancelada. Sessão finalizada.' };
    }

    // Fallback: se ainda estiver no step 1 e não tiver empresa, avança para step 2 como PF
    if (state.step === 1) {
      const companies = await CompanyService.findByUserId(userId);
      if (companies.length === 0) {
        state = { ...state, step: 2, data: { ...state.data, is_personal: true } };
      }
    }

    switch (state.step) {
      case 1:
        return await this._handleTransactionType(state, input, userId);
      case 2:
        return await this._handleCategorySelection(state, input, userId);
      case 3:
        return this._handleAmount(state, input);
      case 4:
        return this._handleDescription(state, input);
      case 5:
        return this._handleDate(state, input);
      case 6:
        return await this._handleConfirmation(state, input, userId);
      default:
        return { done: true, message: '❌ Fluxo inválido.' };
    }
  }

  async _handleTransactionType(state, input, userId) {
    const option = parseInt(input);

    if (option === 1) {
      const newState = {
        ...state,
        step: 2,
        data: { ...state.data, is_personal: true },
      };

      const label = state.data.type === 'income' ? '📈 Entrada - Pessoa Física' : '📉 Saída - Pessoa Física';
      const emoji = state.data.type === 'income' ? '💚' : '🔴';
      const categories = await CategoryService.findByType(state.data.type, userId, false);

      let msg = `${label}\n\n`;
      msg += `🏷️ Escolha a categoria:\n\n`;
      categories.forEach((cat, index) => {
        msg += `  ${emoji} *${index + 1}* ➜ ${cat.name}\n`;
      });
      msg += `\n_Digite o número da categoria_ ✍️`;

      return { newState, message: msg };
    } else if (option === 2) {
      const companies = await CompanyService.findByUserId(userId);

      if (companies.length === 0) {
        return {
          done: true,
          message: '⚠️ Você não possui empresas cadastradas. Cadastre uma empresa primeiro.',
        };
      }

      const newState = {
        ...state,
        step: 2,
        data: { ...state.data, is_personal: false, companies },
      };

      let msg = `🏢 Selecione a empresa:\n\n`;
      companies.forEach((company, index) => {
        msg += `  📊 *${index + 1}* ➜ ${company.name}\n`;
      });
      msg += `\n_Digite o número da empresa_ ✍️`;

      return { newState, message: msg };
    } else {
      return {
        newState: state,
        message: '⚠️ Opção inválida. Digite *1* para Pessoa Física ou *2* para Empresa.',
      };
    }
  }

  async _handleCategorySelection(state, input, userId) {
    // Seleção de empresa (fluxo PJ, ainda sem empresa escolhida)
    if (!state.data.is_personal && !state.data.company_id) {
      const companies = state.data.companies;
      const index = parseInt(input) - 1;

      if (isNaN(index) || index < 0 || index >= companies.length) {
        return {
          newState: state,
          message: `⚠️ Opção inválida. Digite um número de 1 a ${companies.length}.`,
        };
      }

      const selected = companies[index];
      const newState = {
        ...state,
        step: 2,
        data: {
          ...state.data,
          company_id: selected.id,
          company_name: selected.name,
        },
      };

      const label = state.data.type === 'income' ? '📈 Entrada' : '📉 Saída';
      const emoji = state.data.type === 'income' ? '💚' : '🔴';
      const categories = await CategoryService.findByType(state.data.type, userId, true);

      let msg = `${label} - 🏢 ${selected.name}\n\n`;
      msg += `🏷️ Escolha a categoria:\n\n`;
      categories.forEach((cat, index) => {
        msg += `  ${emoji} *${index + 1}* ➜ ${cat.name}\n`;
      });
      msg += `\n_Digite o número da categoria_ ✍️`;

      return { newState, message: msg };
    }

    // Seleção de categoria (PF ou PJ já com empresa selecionada)
    const categories = await CategoryService.findByType(state.data.type, userId, !state.data.is_personal);
    const index = parseInt(input) - 1;

    if (isNaN(index) || index < 0 || index >= categories.length) {
      return {
        newState: state,
        message: `⚠️ Opção inválida. Digite um número de 1 a ${categories.length}.`,
      };
    }

    const selected = categories[index];
    const newState = {
      ...state,
      step: 3,
      data: { ...state.data, category_id: selected.id, category_name: selected.name },
    };

    return {
      newState,
      message: `✅ Categoria: *${selected.name}*\n\n💲 Agora digite o *valor* (ex: 150.00 ou 150):`,
    };
  }

  _handleAmount(state, input) {
    const normalized = input.replace(',', '.');
    const amount = parseFloat(normalized);

    if (isNaN(amount) || amount <= 0) {
      return {
        newState: state,
        message: '⚠️ Valor inválido. Digite um número positivo (ex: 150.00):',
      };
    }

    const newState = {
      ...state,
      step: 4,
      data: { ...state.data, amount },
    };

    return {
      newState,
      message: `✅ Valor: *R$ ${amount.toFixed(2)}*\n\n📝 Digite uma *descrição* (ou digite *pular* para deixar em branco):`,
    };
  }

  _handleDescription(state, input) {
    const description = input.toLowerCase() === 'pular' ? null : input;
    const newState = {
      ...state,
      step: 5,
      data: { ...state.data, description },
    };

    return {
      newState,
      message: `📅 Digite a *data* no formato DD/MM/AAAA\n(ou *pular* para usar a data de hoje):`,
    };
  }

  _handleDate(state, input) {
    let date;
    if (input.toLowerCase() === 'pular') {
      date = new Date();
    } else {
      const parts = input.split('/');
      if (parts.length !== 3) {
        return { newState: state, message: '⚠️ Formato inválido. Use DD/MM/AAAA (ex: 15/01/2026):' };
      }
      const [day, month, year] = parts.map(Number);
      date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) {
        return { newState: state, message: '⚠️ Data inválida. Use DD/MM/AAAA (ex: 15/01/2026):' };
      }
    }

    const dateStr = date.toLocaleDateString('pt-BR');
    const newState = {
      ...state,
      step: 6,
      data: { ...state.data, date },
    };

    const typeLabel = state.data.type === 'income' ? '📈 Entrada' : '📉 Saída';
    const emoji = state.data.type === 'income' ? '💚' : '🔴';
    const transactionTypeIcon = state.data.is_personal ? '👤' : '🏢';
    const transactionTypeLabel = state.data.is_personal ? 'Pessoa Física' : state.data.company_name;

    let summary = `${emoji} *Resumo da ${typeLabel}:*\n`;
    summary += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    summary += `${transactionTypeIcon} Tipo: ${transactionTypeLabel}\n`;
    summary += `🏷️ Categoria: ${state.data.category_name}\n`;
    summary += `💲 Valor: R$ ${state.data.amount.toFixed(2)}\n`;
    summary += `📝 Descrição: ${state.data.description || '(sem descrição)'}\n`;
    summary += `📅 Data: ${dateStr}\n\n`;
    summary += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    summary += `✅ *S* para confirmar\n`;
    summary += `❌ *N* para cancelar`;

    return { newState, message: summary };
  }

  async _handleConfirmation(state, input, userId) {
    if (input.toUpperCase() === 'S') {
      const transactionData = {
        type: state.data.type,
        amount: state.data.amount,
        description: state.data.description,
        category_id: state.data.category_id,
        date: state.data.date,
      };

      if (state.data.is_personal) {
        transactionData.user_id = userId;
      } else {
        transactionData.company_id = state.data.company_id;
      }

      await TransactionService.create(transactionData);

      const typeLabel = state.data.type === 'income' ? 'Entrada' : 'Saída';
      const location = state.data.is_personal ? 'como Pessoa Física' : `da empresa ${state.data.company_name}`;
      return { done: true, message: `🎉✅ ${typeLabel} ${location} registrada com sucesso!` };
    } else {
      return { done: true, message: '❌ Operação cancelada.' };
    }
  }
}

module.exports = new TransactionMenu();

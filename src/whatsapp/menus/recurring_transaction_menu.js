const CategoryService = require('../../services/category_service');
const CompanyService = require('../../services/company_service');
const RecurringTransactionService = require('../../services/recurring_transaction_service');

const FREQUENCY_LABELS = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

const FREQUENCY_EMOJIS = {
  daily: '📆',
  weekly: '🗓️',
  monthly: '📅',
  yearly: '🗃️',
};

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

class RecurringTransactionMenu {
  showMainMenu() {
    return (
      `🔄 *Transações Recorrentes*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Escolha uma opção:\n\n` +
      `1️⃣ ➜ Ver transações recorrentes 📋\n` +
      `2️⃣ ➜ Cadastrar nova 📝\n` +
      `3️⃣ ➜ Remover recorrência 🗑️\n` +
      `0️⃣ ➜ Voltar ao menu 🔙\n\n` +
      `_Digite o número da opção_ ✍️`
    );
  }

  async handleStep(state, input, userId) {
    if (input.toLowerCase() === 'sair') {
      return { done: true, message: '🔚 Operação cancelada.' };
    }

    const { subflow } = state.data;

    if (!subflow) {
      return this._handleMainChoice(state, input, userId);
    }

    if (subflow === 'list') {
      return { done: true, message: '🔙 Voltando ao menu principal.' };
    }

    if (subflow === 'create') {
      return this._handleCreateStep(state, input, userId);
    }

    if (subflow === 'remove') {
      return this._handleRemoveStep(state, input, userId);
    }

    return { done: true, message: '❌ Fluxo inválido.' };
  }

  async _handleMainChoice(state, input, userId) {
    const option = input.trim();

    if (option === '0') {
      return { done: true, message: '' };
    }

    if (option === '1') {
      const list = await this._buildList(userId, state.context);
      return { done: true, message: list };
    }

    if (option === '2') {
      // Inicia fluxo de criação
      if (state.context === 'PJ') {
        const companies = await CompanyService.findByUserId(userId);
        if (companies.length === 0) {
          return { done: true, message: '⚠️ Você não possui empresas cadastradas.' };
        }
        let msg = `🏢 Selecione a empresa:\n\n`;
        companies.forEach((c, i) => {
          msg += `  📊 *${i + 1}* ➜ ${c.name}\n`;
        });
        msg += `\n_Digite o número da empresa_ ✍️`;
        return {
          newState: {
            ...state,
            step: state.step + 1,
            data: { subflow: 'create', create_step: 1, is_personal: false, companies },
          },
          message: msg,
        };
      }

      // PF ou null: vai direto para tipo
      return {
        newState: {
          ...state,
          step: state.step + 1,
          data: { subflow: 'create', create_step: 2, is_personal: true },
        },
        message: this._askType(),
      };
    }

    if (option === '3') {
      const list = await RecurringTransactionService.listByUser(userId);
      if (list.length === 0) {
        return { done: true, message: '📋 Nenhuma transação recorrente cadastrada.' };
      }
      let msg = `🗑️ *Remover Recorrência*\n\n`;
      msg += `Escolha a recorrência para remover:\n\n`;
      list.forEach((rt, i) => {
        const emoji = rt.type === 'income' ? '💚' : '🔴';
        const freq = FREQUENCY_LABELS[rt.frequency] || rt.frequency;
        msg += `  ${emoji} *${i + 1}* ➜ ${rt.description || rt.category?.name} — R$ ${parseFloat(rt.amount).toFixed(2)} (${freq})\n`;
      });
      msg += `\n0️⃣ ➜ Cancelar\n_Digite o número_ ✍️`;
      return {
        newState: {
          ...state,
          step: state.step + 1,
          data: { subflow: 'remove', remove_step: 1, list },
        },
        message: msg,
      };
    }

    return { newState: state, message: `⚠️ Opção inválida.\n\n${this.showMainMenu()}` };
  }

  // ───────────── CREATE FLOW ─────────────

  async _handleCreateStep(state, input, userId) {
    const cs = state.data.create_step;

    // create_step 1: seleção de empresa (contexto PJ)
    if (cs === 1) {
      const companies = state.data.companies;
      const index = parseInt(input) - 1;
      if (isNaN(index) || index < 0 || index >= companies.length) {
        return { newState: state, message: `⚠️ Opção inválida. Digite um número de 1 a ${companies.length}.` };
      }
      const selected = companies[index];
      return {
        newState: {
          ...state,
          step: state.step + 1,
          data: { ...state.data, create_step: 2, company_id: selected.id, company_name: selected.name },
        },
        message: this._askType(),
      };
    }

    // create_step 2: tipo (income/expense)
    if (cs === 2) {
      if (input === '1' || input === '2') {
        const type = input === '1' ? 'income' : 'expense';
        const isCompany = !state.data.is_personal;
        const categories = await CategoryService.findByType(type, userId, isCompany);
        const emoji = type === 'income' ? '💚' : '🔴';
        let msg = `🏷️ Escolha a *categoria*:\n\n`;
        categories.forEach((c, i) => {
          msg += `  ${emoji} *${i + 1}* ➜ ${c.name}\n`;
        });
        msg += `\n_Digite o número da categoria_ ✍️`;
        return {
          newState: {
            ...state,
            step: state.step + 1,
            data: { ...state.data, create_step: 3, type, categories },
          },
          message: msg,
        };
      }
      return { newState: state, message: `⚠️ Digite *1* para Receita ou *2* para Despesa.` };
    }

    // create_step 3: categoria
    if (cs === 3) {
      const categories = state.data.categories;
      const index = parseInt(input) - 1;
      if (isNaN(index) || index < 0 || index >= categories.length) {
        return { newState: state, message: `⚠️ Opção inválida. Digite um número de 1 a ${categories.length}.` };
      }
      const selected = categories[index];
      return {
        newState: {
          ...state,
          step: state.step + 1,
          data: { ...state.data, create_step: 4, category_id: selected.id, category_name: selected.name },
        },
        message: `✅ Categoria: *${selected.name}*\n\n💲 Digite o *valor* (ex: 1500.00):`,
      };
    }

    // create_step 4: valor
    if (cs === 4) {
      const amount = parseFloat(input.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        return { newState: state, message: '⚠️ Valor inválido. Digite um número positivo (ex: 1500.00):' };
      }
      return {
        newState: {
          ...state,
          step: state.step + 1,
          data: { ...state.data, create_step: 5, amount },
        },
        message: `✅ Valor: *R$ ${amount.toFixed(2)}*\n\n📝 Digite uma *descrição* (ex: Aluguel) ou *pular*:`,
      };
    }

    // create_step 5: descrição
    if (cs === 5) {
      const description = input.toLowerCase() === 'pular' ? null : input;
      return {
        newState: {
          ...state,
          step: state.step + 1,
          data: { ...state.data, create_step: 6, description },
        },
        message: this._askFrequency(),
      };
    }

    // create_step 6: frequência
    if (cs === 6) {
      const index = parseInt(input) - 1;
      if (isNaN(index) || index < 0 || index >= FREQUENCIES.length) {
        return { newState: state, message: `⚠️ Opção inválida.\n\n${this._askFrequency()}` };
      }
      const frequency = FREQUENCIES[index];
      return {
        newState: {
          ...state,
          step: state.step + 1,
          data: { ...state.data, create_step: 7, frequency },
        },
        message: `✅ Frequência: *${FREQUENCY_LABELS[frequency]}*\n\n📅 Digite a *data de início* (DD/MM/AAAA)\n(ex: 05/03/2026):`,
      };
    }

    // create_step 7: data de início
    if (cs === 7) {
      const parsed = this._parseDate(input);
      if (!parsed) {
        return { newState: state, message: '⚠️ Data inválida. Use DD/MM/AAAA (ex: 05/03/2026):' };
      }
      const [dateStr, dateDisplay] = parsed;
      const d = state.data;
      const locationLabel = d.is_personal ? '👤 Pessoal' : `🏢 ${d.company_name}`;
      const typeLabel = d.type === 'income' ? '📈 Receita' : '📉 Despesa';
      const freqEmoji = FREQUENCY_EMOJIS[d.frequency];

      let summary = `🔄 *Resumo da Recorrência:*\n`;
      summary += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      summary += `${locationLabel}\n`;
      summary += `${typeLabel}\n`;
      summary += `🏷️ Categoria: ${d.category_name}\n`;
      summary += `💲 Valor: R$ ${d.amount.toFixed(2)}\n`;
      summary += `📝 Descrição: ${d.description || '(sem descrição)'}\n`;
      summary += `${freqEmoji} Frequência: ${FREQUENCY_LABELS[d.frequency]}\n`;
      summary += `📅 Próxima data: ${dateDisplay}\n\n`;
      summary += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      summary += `✅ *S* para confirmar\n`;
      summary += `❌ *N* para cancelar`;

      return {
        newState: {
          ...state,
          step: state.step + 1,
          data: { ...state.data, create_step: 8, next_date: dateStr },
        },
        message: summary,
      };
    }

    // create_step 8: confirmação
    if (cs === 8) {
      if (input.toUpperCase() === 'S') {
        const d = state.data;
        await RecurringTransactionService.create(
          {
            type: d.type,
            amount: d.amount,
            description: d.description,
            category_id: d.category_id,
            company_id: d.is_personal ? null : d.company_id,
            frequency: d.frequency,
            next_date: d.next_date,
          },
          userId
        );
        const freq = FREQUENCY_LABELS[d.frequency].toLowerCase();
        return {
          done: true,
          message: `🎉✅ Recorrência cadastrada!\n\nA transação será gerada automaticamente a cada *${freq}* a partir de *${d.next_date.split('-').reverse().join('/')}*.`,
        };
      }
      return { done: true, message: '❌ Operação cancelada.' };
    }

    return { done: true, message: '❌ Fluxo inválido.' };
  }

  // ───────────── REMOVE FLOW ─────────────

  async _handleRemoveStep(state, input, userId) {
    if (input === '0') {
      return { done: true, message: '❌ Remoção cancelada.' };
    }

    if (state.data.remove_step === 1) {
      const list = state.data.list;
      const index = parseInt(input) - 1;
      if (isNaN(index) || index < 0 || index >= list.length) {
        return { newState: state, message: `⚠️ Opção inválida. Digite um número de 1 a ${list.length} ou 0 para cancelar.` };
      }
      const selected = list[index];
      const freq = FREQUENCY_LABELS[selected.frequency] || selected.frequency;
      const label = selected.description || selected.category?.name;
      const confirmMsg =
        `⚠️ Confirma a remoção da recorrência?\n\n` +
        `*${label}* — R$ ${parseFloat(selected.amount).toFixed(2)} (${freq})\n\n` +
        `✅ *S* para confirmar | ❌ *N* para cancelar`;

      return {
        newState: {
          ...state,
          step: state.step + 1,
          data: { ...state.data, remove_step: 2, selected_id: selected.id, selected_label: label },
        },
        message: confirmMsg,
      };
    }

    if (state.data.remove_step === 2) {
      if (input.toUpperCase() === 'S') {
        await RecurringTransactionService.deactivate(state.data.selected_id, userId);
        return { done: true, message: `🗑️ Recorrência *${state.data.selected_label}* removida com sucesso.` };
      }
      return { done: true, message: '❌ Remoção cancelada.' };
    }

    return { done: true, message: '❌ Fluxo inválido.' };
  }

  // ───────────── HELPERS ─────────────

  async _buildList(userId, context) {
    let list;
    if (context === 'PJ') {
      // Mostra todas as recorrências das empresas do usuário (simplificado: por user_id nas recorrências pessoais)
      list = await RecurringTransactionService.listByUser(userId);
    } else {
      list = await RecurringTransactionService.listByUser(userId);
    }

    if (list.length === 0) {
      return '📋 Nenhuma transação recorrente cadastrada.\n\nUse a opção *2* para cadastrar.';
    }

    let msg = `📋 *Transações Recorrentes*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const rt of list) {
      const emoji = rt.type === 'income' ? '💚' : '🔴';
      const freq = FREQUENCY_LABELS[rt.frequency] || rt.frequency;
      const freqEmoji = FREQUENCY_EMOJIS[rt.frequency] || '📅';
      const nextDate = String(rt.next_date).split('-').reverse().join('/');
      const label = rt.description || rt.category?.name || '—';
      msg += `${emoji} *${label}*\n`;
      msg += `   🏷️ ${rt.category?.name || '—'}  |  💲 R$ ${parseFloat(rt.amount).toFixed(2)}\n`;
      msg += `   ${freqEmoji} ${freq}  |  📅 Próxima: ${nextDate}\n\n`;
    }
    return msg;
  }

  _askType() {
    return (
      `🔄 *Tipo da transação recorrente:*\n\n` +
      `  💚 *1* ➜ Receita (Entrada)\n` +
      `  🔴 *2* ➜ Despesa (Saída)\n\n` +
      `_Digite 1 ou 2_ ✍️`
    );
  }

  _askFrequency() {
    return (
      `🔁 *Com que frequência se repete?*\n\n` +
      `  📆 *1* ➜ Diária\n` +
      `  🗓️ *2* ➜ Semanal\n` +
      `  📅 *3* ➜ Mensal\n` +
      `  🗃️ *4* ➜ Anual\n\n` +
      `_Digite o número_ ✍️`
    );
  }

  _parseDate(input) {
    const parts = input.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateDisplay = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    return [dateStr, dateDisplay];
  }
}

module.exports = new RecurringTransactionMenu();

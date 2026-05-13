const CategoryService = require('../../services/category_service');

class CategoryMenu {
  async showOptions() {
    return (
      `🏷️ *Gerenciar Categorias*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `  📋 *1* ➜ Listar todas as categorias\n` +
      `  ➕ *2* ➜ Criar nova categoria\n` +
      `  🗑️ *3* ➜ Excluir categoria\n` +
      `  🔙 *0* ➜ Voltar ao menu\n` +
      `  🔚 *sair* ➜ Finalizar sessão\n\n` +
      `_Digite o número da opção_ ✍️`
    );
  }

  async handleStep(state, input, userId) {
    // Opção sair em qualquer etapa
    if (input.toLowerCase() === 'sair' || input === '0') {
      return { done: true, message: '🔚 Sessão finalizada.' };
    }

    switch (state.step) {
      case 1:
        return await this._handleOptionSelection(state, input, userId);
      case 2:
        return this._handleNewCategoryName(state, input);
      case 3:
        return await this._handleNewCategoryType(state, input, userId);
      case 4:
        return await this._handleDeleteSelection(state, input);
      case 5:
        return await this._handleDeleteConfirmation(state, input);
      default:
        return { done: true, message: '❌ Fluxo inválido.' };
    }
  }

  async _handleOptionSelection(state, input, userId) {
    switch (input) {
      case '1': {
        const categories = await CategoryService.findAll(userId);
        let msg = `📋 *Categorias cadastradas:*\n\n`;

        msg += `💚 *Receitas:*\n`;
        categories
          .filter((c) => c.type === 'income' || c.type === 'both')
          .forEach((c) => {
            const tag = c.is_default ? '📌' : '✨';
            msg += `  ${tag} ${c.name}\n`;
          });

        msg += `\n🔴 *Despesas:*\n`;
        categories
          .filter((c) => c.type === 'expense' || c.type === 'both')
          .forEach((c) => {
            const tag = c.is_default ? '📌' : '✨';
            msg += `  ${tag} ${c.name}\n`;
          });

        msg += `\n📌 = padrão | ✨ = customizada`;

        return { done: true, message: msg };
      }
      case '2': {
        const newState = { ...state, step: 2, data: {} };
        return { newState, message: '✏️ Digite o *nome* da nova categoria:' };
      }
      case '3': {
        const categories = await CategoryService.findAll(userId);
        const custom = categories.filter((c) => !c.is_default);
        if (custom.length === 0) {
          return { done: true, message: '⚠️ Nenhuma categoria customizada para excluir.' };
        }
        let msg = `🗑️ *Categorias customizadas:*\n\n`;
        custom.forEach((c, i) => {
          msg += `  *${i + 1}* ➜ ${c.name} (${c.type})\n`;
        });
        msg += `\n_Digite o número para excluir_ ✍️`;
        const newState = { ...state, step: 4, data: { customCategories: custom } };
        return { newState, message: msg };
      }
      default:
        return { done: true, message: '⚠️ Opção inválida.' };
    }
  }

  _handleNewCategoryName(state, input) {
    const newState = { ...state, step: 3, data: { ...state.data, name: input.trim() } };
    return {
      newState,
      message:
        `✅ Nome: *${input.trim()}*\n\n` +
        `Qual o tipo?\n\n` +
        `  💚 *1* ➜ Receita (entrada)\n` +
        `  🔴 *2* ➜ Despesa (saída)\n` +
        `  🔵 *3* ➜ Ambos\n\n` +
        `_Digite o número_ ✍️`,
    };
  }

  async _handleNewCategoryType(state, input, userId) {
    const typeMap = { '1': 'income', '2': 'expense', '3': 'both' };
    const type = typeMap[input];
    if (!type) {
      return { newState: state, message: '⚠️ Opção inválida. Digite 1, 2 ou 3.' };
    }
    try {
      await CategoryService.create({ name: state.data.name, type, user_id: userId });
      return { done: true, message: `🎉✅ Categoria *${state.data.name}* criada com sucesso!` };
    } catch (error) {
      return { done: true, message: `❌ Erro: ${error.message}` };
    }
  }

  async _handleDeleteSelection(state, input) {
    const index = parseInt(input) - 1;
    const custom = state.data.customCategories;
    if (isNaN(index) || index < 0 || index >= custom.length) {
      return { newState: state, message: '⚠️ Opção inválida.' };
    }
    const category = custom[index];
    const newState = {
      ...state,
      step: 5,
      data: { ...state.data, deleteId: category.id, deleteName: category.name },
    };
    return {
      newState,
      message: `🗑️ Tem certeza que deseja excluir *${category.name}*?\n\n✅ *S* para confirmar\n❌ *N* para cancelar`,
    };
  }

  async _handleDeleteConfirmation(state, input) {
    if (input.toUpperCase() === 'S') {
      try {
        await CategoryService.delete(state.data.deleteId);
        return { done: true, message: `🗑️✅ Categoria *${state.data.deleteName}* excluída!` };
      } catch (error) {
        return { done: true, message: `❌ Erro: ${error.message}` };
      }
    }
    return { done: true, message: '❌ Operação cancelada.' };
  }
}

module.exports = new CategoryMenu();

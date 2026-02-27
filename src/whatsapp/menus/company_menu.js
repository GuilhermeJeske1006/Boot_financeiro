const CompanyService = require('../../services/company_service');
const SubscriptionService = require('../../services/subscription_service');

class CompanyMenu {
  async showMenu(userId) {
    const [companies, canAdd] = await Promise.all([
      CompanyService.findByUserId(userId),
      SubscriptionService.canAddCompany(userId),
    ]);

    let msg = `🏢 *Gerenciar Empresas*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (companies.length > 0) {
      msg += `📊 Suas empresas:\n\n`;
      companies.forEach((company, index) => {
        msg += `  ${index + 1}. *${company.name}*\n`;
        if (company.cnpj) msg += `     CNPJ: ${company.cnpj}\n`;
      });
      msg += `\n`;
    } else {
      msg += `⚠️ Você ainda não tem empresas cadastradas.\n\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*Opções:*\n`;
    if (canAdd) {
      msg += `  ➕ *1* ➜ Cadastrar empresa\n`;
    } else {
      msg += `  🔒 *Cadastrar empresa* ➜ Disponível apenas no plano Business\n`;
    }
    if (companies.length > 0) {
      msg += `  📋 *2* ➜ Ver detalhes\n`;
      msg += `  ✏️ *3* ➜ Editar empresa\n`;
      msg += `  🗑️ *4* ➜ Excluir empresa\n`;
    }
    msg += `  🔙 *0* ➜ Voltar ao menu\n`;
    msg += `  🔚 *sair* ➜ Finalizar sessão\n`;

    return msg;
  }

  async startCreateFlow() {
    return {
      message: `🏢 *Cadastrar Nova Empresa*\n\n📝 Digite o *nome* da empresa:`,
    };
  }

  async handleStep(state, input, userId) {
    // Opção sair em qualquer etapa
    if (input.toLowerCase() === 'sair') {
      return { done: true, message: '🔚 Sessão finalizada.' };
    }

    switch (state.flow) {
      case 'create':
        return await this._handleCreateFlow(state, input, userId);
      case 'view':
        return await this._handleViewFlow(state, input, userId);
      case 'edit':
        return await this._handleEditFlow(state, input, userId);
      case 'delete':
        return await this._handleDeleteFlow(state, input, userId);
      default:
        return { done: true, message: '❌ Fluxo inválido.' };
    }
  }

  async _handleCreateFlow(state, input, userId) {
    switch (state.step) {
      case 1:
        if (!input || input.trim() === '') {
          return { newState: state, message: '⚠️ Nome não pode ser vazio. Digite o nome da empresa:' };
        }
        return {
          newState: { ...state, step: 2, data: { name: input.trim() } },
          message: `✅ Nome: *${input.trim()}*\n\n📄 Digite o *CNPJ* (ou *pular* para deixar em branco):`,
        };

      case 2:
        const cnpj = input.toLowerCase() === 'pular' ? null : input.replace(/[^\d]/g, '');
        return {
          newState: { ...state, step: 3, data: { ...state.data, cnpj } },
          message: `📧 Digite o *e-mail* da empresa (ou *pular*):`,
        };

      case 3:
        const email = input.toLowerCase() === 'pular' ? null : input.trim();
        return {
          newState: { ...state, step: 4, data: { ...state.data, email } },
          message: `📱 Digite o *telefone* da empresa (ou *pular*):`,
        };

      case 4:
        const phone = input.toLowerCase() === 'pular' ? null : input.trim();
        return {
          newState: { ...state, step: 5, data: { ...state.data, phone } },
          message: `📍 Digite o *endereço* da empresa (ou *pular*):`,
        };

      case 5:
        const address = input.toLowerCase() === 'pular' ? null : input.trim();
        const newState = { ...state, step: 6, data: { ...state.data, address } };

        let summary = `🏢 *Resumo da Empresa:*\n`;
        summary += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        summary += `📝 Nome: ${state.data.name}\n`;
        summary += `📄 CNPJ: ${state.data.cnpj || '(não informado)'}\n`;
        summary += `📧 E-mail: ${state.data.email || '(não informado)'}\n`;
        summary += `📱 Telefone: ${state.data.phone || '(não informado)'}\n`;
        summary += `📍 Endereço: ${address || '(não informado)'}\n\n`;
        summary += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        summary += `✅ *S* para confirmar\n`;
        summary += `❌ *N* para cancelar`;

        return { newState, message: summary };

      case 6:
        if (input.toUpperCase() === 'S') {
          try {
            const company = await CompanyService.create({
              ...state.data,
              user_id: userId,
            });
            return {
              done: true,
              message: `🎉✅ Empresa *${company.name}* cadastrada com sucesso!`,
            };
          } catch (error) {
            return {
              done: true,
              message: `❌ Erro ao cadastrar empresa: ${error.message}`,
            };
          }
        } else {
          return { done: true, message: '❌ Cadastro cancelado.' };
        }

      default:
        return { done: true, message: '❌ Fluxo inválido.' };
    }
  }

  async _handleViewFlow(state, input, userId) {
    if (state.step === 1) {
      const companies = await CompanyService.findByUserId(userId);
      const index = parseInt(input) - 1;

      if (isNaN(index) || index < 0 || index >= companies.length) {
        return {
          newState: state,
          message: `⚠️ Opção inválida. Digite um número de 1 a ${companies.length}.`,
        };
      }

      const company = companies[index];
      let msg = `🏢 *${company.name}*\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      msg += `📄 CNPJ: ${company.cnpj || '(não informado)'}\n`;
      msg += `📧 E-mail: ${company.email || '(não informado)'}\n`;
      msg += `📱 Telefone: ${company.phone || '(não informado)'}\n`;
      msg += `📍 Endereço: ${company.address || '(não informado)'}\n`;

      return { done: true, message: msg };
    }
  }

  async _handleEditFlow(state, input, userId) {
    if (state.step === 1) {
      const companies = await CompanyService.findByUserId(userId);
      const index = parseInt(input) - 1;

      if (isNaN(index) || index < 0 || index >= companies.length) {
        return {
          newState: state,
          message: `⚠️ Opção inválida. Digite um número de 1 a ${companies.length}.`,
        };
      }

      const company = companies[index];
      return {
        newState: { ...state, step: 2, data: { company_id: company.id } },
        message: `✏️ Editando: *${company.name}*\n\nDigite o *novo nome* (ou *pular* para manter):`,
      };
    }

    if (state.step === 2) {
      const name = input.toLowerCase() === 'pular' ? undefined : input.trim();
      return {
        newState: { ...state, step: 3, data: { ...state.data, name } },
        message: `📄 Digite o *novo CNPJ* (ou *pular* para manter):`,
      };
    }

    if (state.step === 3) {
      const cnpj = input.toLowerCase() === 'pular' ? undefined : input.replace(/[^\d]/g, '');
      return {
        newState: { ...state, step: 4, data: { ...state.data, cnpj } },
        message: `📧 Digite o *novo e-mail* (ou *pular* para manter):`,
      };
    }

    if (state.step === 4) {
      const email = input.toLowerCase() === 'pular' ? undefined : input.trim();
      return {
        newState: { ...state, step: 5, data: { ...state.data, email } },
        message: `📱 Digite o *novo telefone* (ou *pular* para manter):`,
      };
    }

    if (state.step === 5) {
      const phone = input.toLowerCase() === 'pular' ? undefined : input.trim();
      return {
        newState: { ...state, step: 6, data: { ...state.data, phone } },
        message: `📍 Digite o *novo endereço* (ou *pular* para manter):`,
      };
    }

    if (state.step === 6) {
      const address = input.toLowerCase() === 'pular' ? undefined : input.trim();
      const newState = { ...state, step: 7, data: { ...state.data, address } };

      let summary = `✏️ *Confirmar alterações?*\n\n`;
      summary += `✅ *S* para confirmar\n`;
      summary += `❌ *N* para cancelar`;

      return { newState, message: summary };
    }

    if (state.step === 7) {
      if (input.toUpperCase() === 'S') {
        try {
          const updateData = {};
          if (state.data.name !== undefined) updateData.name = state.data.name;
          if (state.data.cnpj !== undefined) updateData.cnpj = state.data.cnpj;
          if (state.data.email !== undefined) updateData.email = state.data.email;
          if (state.data.phone !== undefined) updateData.phone = state.data.phone;
          if (state.data.address !== undefined) updateData.address = state.data.address;

          await CompanyService.update(state.data.company_id, userId, updateData);
          return { done: true, message: `🎉✅ Empresa atualizada com sucesso!` };
        } catch (error) {
          return { done: true, message: `❌ Erro ao atualizar empresa: ${error.message}` };
        }
      } else {
        return { done: true, message: '❌ Edição cancelada.' };
      }
    }
  }

  async _handleDeleteFlow(state, input, userId) {
    if (state.step === 1) {
      const companies = await CompanyService.findByUserId(userId);
      const index = parseInt(input) - 1;

      if (isNaN(index) || index < 0 || index >= companies.length) {
        return {
          newState: state,
          message: `⚠️ Opção inválida. Digite um número de 1 a ${companies.length}.`,
        };
      }

      const company = companies[index];
      return {
        newState: { ...state, step: 2, data: { company_id: company.id, company_name: company.name } },
        message: `⚠️ Tem certeza que deseja excluir *${company.name}*?\n\n✅ *S* para confirmar\n❌ *N* para cancelar`,
      };
    }

    if (state.step === 2) {
      if (input.toUpperCase() === 'S') {
        try {
          await CompanyService.delete(state.data.company_id, userId);
          return {
            done: true,
            message: `🗑️✅ Empresa *${state.data.company_name}* excluída com sucesso!`,
          };
        } catch (error) {
          return { done: true, message: `❌ Erro ao excluir empresa: ${error.message}` };
        }
      } else {
        return { done: true, message: '❌ Exclusão cancelada.' };
      }
    }
  }
}

module.exports = new CompanyMenu();

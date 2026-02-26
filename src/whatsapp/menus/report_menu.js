const ReportService = require('../../services/report_service');
const CompanyService = require('../../services/company_service');

class ReportMenu {
  async showCurrentMonthBalance(userId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return await ReportService.generateMonthlyReport(year, month, userId);
  }

  async showCurrentMonthBalanceCompany(userId, companyId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return await ReportService.generateMonthlyReportCompany(year, month, userId, companyId);
  }

  async showMenu(userId) {
    let msg = `📊 *Relatórios Financeiros*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `*Escolha o tipo de relatório:*\n\n`;
    msg += `  👤 *1* ➜ Relatório Pessoal\n`;
    msg += `  🏢 *2* ➜ Relatório por Empresa\n`;
    msg += `  🔙 *0* ➜ Voltar ao menu\n`;
    msg += `  🔚 *sair* ➜ Finalizar sessão\n`;
    return msg;
  }

  askMonth() {
    return '📅 Digite o *mês e ano* para o relatório\n(formato: MM/AAAA, ex: 01/2026):';
  }

  async handleStep(state, input, userId) {
    // Opção sair em qualquer etapa
    if (input.toLowerCase() === 'sair') {
      return { done: true, message: '🔚 Sessão finalizada.' };
    }

    if (state.step === 1) {
      const option = parseInt(input);

      if (option === 1) {
        return {
          newState: { ...state, step: 2, data: { is_personal: true } },
          message: this.askMonth(),
        };
      } else if (option === 2) {
        const companies = await CompanyService.findByUserId(userId);

        if (companies.length === 0) {
          return {
            done: true,
            message: '⚠️ Você não possui empresas cadastradas.',
          };
        }

        let msg = `🏢 Escolha a empresa:\n\n`;
        companies.forEach((company, index) => {
          msg += `  📊 *${index + 1}* ➜ ${company.name}\n`;
        });
        msg += `\n_Digite o número da empresa_ ✍️`;

        return {
          newState: { ...state, step: 2, data: { is_personal: false, companies } },
          message: msg,
        };
      } else {
        return {
          newState: state,
          message: '⚠️ Opção inválida. Digite *1* para Pessoal ou *2* para Empresa.',
        };
      }
    }

    if (state.step === 2) {
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
        return {
          newState: { ...state, step: 3, data: { ...state.data, company_id: selected.id } },
          message: this.askMonth(),
        };
      }

      return {
        newState: { ...state, step: 3 },
        message: this.askMonth(),
      };
    }

    if (state.step === 3) {
      const parts = input.split('/');
      if (parts.length !== 2) {
        return { newState: state, message: '⚠️ Formato inválido. Use MM/AAAA (ex: 01/2026):' };
      }
      const [month, year] = parts.map(Number);
      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return { newState: state, message: '⚠️ Mês/ano inválido. Use MM/AAAA (ex: 01/2026):' };
      }

      const companyId = state.data.is_personal ? null : state.data.company_id;
      const report = await ReportService.generateMonthlyReport(year, month, userId, companyId);
      return { done: true, message: report };
    }

    return { done: true, message: '❌ Fluxo inválido.' };
  }
}

module.exports = new ReportMenu();

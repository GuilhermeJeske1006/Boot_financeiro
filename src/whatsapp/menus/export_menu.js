const ExportService = require('../../services/export_service');
const CompanyService = require('../../services/company_service');

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

class ExportMenu {
  showMenu() {
    let msg = `📤 *Exportar Relatório*\n`;
    msg += `\n`;
    msg += `*Escolha o formato de exportação:*\n\n`;
    msg += `  📄 *1* ➜ PDF\n`;
    msg += `  📊 *2* ➜ Excel (.xlsx)\n`;
    msg += `  🔙 *0* ➜ Voltar ao menu\n`;
    msg += `  🔚 *sair* ➜ Finalizar sessão\n`;
    return msg;
  }

  askMonth() {
    return '📅 Digite o *mês e ano* para o relatório\n(formato: MM/AAAA, ex: 01/2026):';
  }

  async handleStep(state, input, userId) {
    if (input.toLowerCase() === 'sair') {
      return { done: true, message: '🔚 Sessão finalizada.' };
    }

    if (state.step === 1) {
      if (input === '0') return { done: true, message: '' };

      const option = parseInt(input);
      if (option !== 1 && option !== 2) {
        return {
          newState: state,
          message: '⚠️ Opção inválida. Digite *1* para PDF ou *2* para Excel.',
        };
      }

      const format = option === 1 ? 'pdf' : 'excel';

      if (state.context === 'PJ') {
        const companies = await CompanyService.findByUserId(userId);
        if (companies.length === 0) {
          return { done: true, message: '⚠️ Você não possui empresas cadastradas.' };
        }

        let msg = `🏢 Escolha a empresa para exportar:\n\n`;
        companies.forEach((company, index) => {
          msg += `  📊 *${index + 1}* ➜ ${company.name}\n`;
        });
        msg += `\n_Digite o número da empresa_ ✍️`;

        return {
          newState: { ...state, step: 2, data: { ...state.data, format, companies } },
          message: msg,
        };
      }

      return {
        newState: { ...state, step: 3, data: { ...state.data, format, company_id: null } },
        message: this.askMonth(),
      };
    }

    if (state.step === 2) {
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

    if (state.step === 3) {
      const parts = input.split('/');
      if (parts.length !== 2) {
        return { newState: state, message: '⚠️ Formato inválido. Use MM/AAAA (ex: 01/2026):' };
      }
      const [month, year] = parts.map(Number);
      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return { newState: state, message: '⚠️ Mês/ano inválido. Use MM/AAAA (ex: 01/2026):' };
      }

      const companyId = state.data.company_id || null;
      const format = state.data.format;
      const monthName = MONTH_NAMES[month - 1];

      try {
        if (format === 'pdf') {
          const doc = await ExportService.generatePDF(year, month, userId, companyId);
          const buffer = await streamToBuffer(doc);

          return {
            done: true,
            message: `✅ Relatório PDF de *${monthName}/${year}* gerado com sucesso!`,
            media: {
              data: buffer.toString('base64'),
              mimetype: 'application/pdf',
              filename: `relatorio-${monthName}-${year}.pdf`,
            },
          };
        } else {
          const buffer = await ExportService.generateExcel(year, month, userId, companyId);

          return {
            done: true,
            message: `✅ Relatório Excel de *${monthName}/${year}* gerado com sucesso!`,
            media: {
              data: buffer.toString('base64'),
              mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              filename: `relatorio-${monthName}-${year}.xlsx`,
            },
          };
        }
      } catch (error) {
        return { done: true, message: `❌ Erro ao gerar relatório: ${error.message}` };
      }
    }

    return { done: true, message: '❌ Fluxo inválido.' };
  }
}

module.exports = new ExportMenu();

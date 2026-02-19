const ReportService = require('../../services/report_service');

class ReportMenu {
  async showCurrentMonthBalance(userId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return await ReportService.generateMonthlyReport(year, month, userId);
  }

  askMonth() {
    return '📅 Digite o *mês e ano* para o relatório\n(formato: MM/AAAA, ex: 01/2026):';
  }

  async handleStep(state, input, userId) {
    switch (state.step) {
      case 1: {
        const parts = input.split('/');
        if (parts.length !== 2) {
          return { newState: state, message: '⚠️ Formato inválido. Use MM/AAAA (ex: 01/2026):' };
        }
        const [month, year] = parts.map(Number);
        if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
          return { newState: state, message: '⚠️ Mês/ano inválido. Use MM/AAAA (ex: 01/2026):' };
        }
        const report = await ReportService.generateMonthlyReport(year, month, userId);
        return { done: true, message: report };
      }
      default:
        return { done: true, message: '❌ Fluxo inválido.' };
    }
  }
}

module.exports = new ReportMenu();

const ReportService = require('../../services/report_service');

class ReportMenu {
  askMonth() {
    return '📅 Digite o *mês e ano* para o relatório\n(formato: MM/AAAA, ex: 01/2026):';
  }

  async handleStep(state, input, userId) {
    if (input.toLowerCase() === 'sair') {
      return { done: true, message: '🔚 Sessão finalizada.' };
    }

    if (state.step === 1) {
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

    return { done: true, message: '❌ Fluxo inválido.' };
  }
}

module.exports = new ReportMenu();

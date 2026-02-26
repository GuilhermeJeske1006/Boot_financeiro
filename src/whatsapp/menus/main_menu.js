const CompanyService = require('../../services/company_service');

class MainMenu {
  async show(userId) {
    const companies = await CompanyService.findByUserId(userId);
    const hasCompanies = companies.length > 0;

    let menu = (
      `💰 *Bot Financeiro* 💰\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Escolha uma opção:\n\n` +
      `1️⃣ ➜ Registrar Entrada 📈\n` +
      `2️⃣ ➜ Registrar Saída 📉\n` +
      `3️⃣ ➜ Ver Relatório Mensal 📊\n`
    );

    if (hasCompanies) {
      menu += `4️⃣ ➜ Gerenciar Empresas 🏢\n`;
    }

    menu += `0️⃣ ➜ Sair 🔚\n`;
    menu += `\n_Digite o número da opção desejada_ ✍️`;

    return menu;
  }
}

module.exports = new MainMenu();
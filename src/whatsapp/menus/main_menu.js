const UserRepository = require('../../repositories/user_respository');
const CompanyService = require('../../services/company_service');

class MainMenu {
  async show(userId) {
    const user = await UserRepository.findById(userId);
    const companies = await CompanyService.findByUserId(userId);

    const hasCompanies = user.user_type === 'PJ' || companies.length > 0;

    let menu = (
      `💰 *Bot Financeiro* 💰\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `Escolha uma opção:\n\n` +
      `1️⃣ ➜ Registrar Entrada 📈\n` +
      `2️⃣ ➜ Registrar Saída 📉\n` +
      `3️⃣ ➜ Ver Saldo do Mês 💵\n` +
      `4️⃣ ➜ Ver Relatório Mensal 📊\n` +
      `5️⃣ ➜ Gerenciar Categorias 🏷️\n`
    );

    if (hasCompanies) {
      menu += `6️⃣ ➜ Gerenciar Empresas 🏢\n`;
    }

    menu += `\n_Digite o número da opção desejada_ ✍️`;

    return menu;
  }
}

module.exports = new MainMenu();

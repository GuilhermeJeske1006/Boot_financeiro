const CompanyService = require('../../services/company_service');
const SubscriptionRepository = require('../../repositories/subscription_repository');

class MainMenu {
  async show(userId) {
    const [companies, subscription] = await Promise.all([
      CompanyService.findByUserId(userId),
      SubscriptionRepository.findActiveByUserId(userId),
    ]);

    const hasCompanies = companies.length > 0;
    const planName = subscription?.plan?.name || 'free';
    const planLabel = planName === 'free' ? '🆓 Grátis' : planName === 'pro' ? '⭐ Pro' : '🏆 Business';
    const hasRecurring = !!subscription?.plan?.recurring_transactions;
    const hasExport = !!subscription?.plan?.pdf_export;

    let menu = (
      `💰 *Bot Financeiro* 💰\n` +
      `\n` +
      `Plano: ${planLabel}\n\n` +
      `Escolha uma opção:\n\n` +
      `1️⃣ ➜ Registrar Entrada 📈\n` +
      `2️⃣ ➜ Registrar Saída 📉\n` +
      `3️⃣ ➜ Ver Relatório Mensal 📊\n`
    );

    if (hasCompanies) {
      menu += `4️⃣ ➜ Gerenciar Empresas 🏢\n`;
    }

    menu += `5️⃣ ➜ Meu Plano / Upgrade 💳\n`;

    if (hasRecurring) {
      menu += `6️⃣ ➜ Transações Recorrentes 🔄\n`;
    }

    if (hasExport) {
      menu += `7️⃣ ➜ Exportar Relatório (PDF/Excel) 📤\n`;
    }

    menu += `8️⃣ ➜ Editar Perfil 👤\n`;
    menu += `0️⃣ ➜ Sair 🔚\n`;
    menu += `\n_Digite o número da opção desejada_ ✍️`;

    return menu;
  }
}

module.exports = new MainMenu();
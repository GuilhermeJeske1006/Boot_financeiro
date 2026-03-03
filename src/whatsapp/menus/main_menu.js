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
    const hasBudgets = !!subscription?.plan?.category_budgets;

    const lock = ' 🔒';

    let menu = `💰 *Bot Financeiro* 💰\n`;
    menu += `Plano atual: ${planLabel}\n\n`;

    menu += `━━━ 💸 *Lançamentos* ━━━\n`;
    menu += `*1* ➜ Nova Entrada 📈\n`;
    menu += `*2* ➜ Nova Saída 📉\n`;
    menu += `*3* ➜ Recorrentes 🔄${hasRecurring ? '' : lock}\n\n`;

    menu += `━━━ 📊 *Relatórios* ━━━\n`;
    menu += `*4* ➜ Relatório Mensal 📊\n`;
    menu += `*5* ➜ Exportar PDF/Excel 📤${hasExport ? '' : lock}\n`;
    menu += `*6* ➜ Metas e Orçamentos 🎯${hasBudgets ? '' : lock}\n\n`;

    menu += `━━━ ⚙️ *Conta* ━━━\n`;
    if (hasCompanies) {
      menu += `*7* ➜ Empresas 🏢\n`;
    }
    menu += `*8* ➜ Meu Plano / Upgrade 💳\n`;
    menu += `*9* ➜ Editar Perfil 👤\n`;
    menu += `*0* ➜ Sair 🔚\n\n`;

    menu += `_Digite o número da opção_ ✍️`;

    return menu;
  }
}

module.exports = new MainMenu();

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
    const hasOpenBanking = !!subscription?.plan?.open_banking;

    const lock = ' 🔒';

    let menu = `💰 *Bot Financeiro* 💰\n`;
    menu += `Plano atual: ${planLabel}\n\n`;

    menu += `━━━ 💸 *Lançamentos* ━━━\n`;
    menu += `*1* ➜ Nova Entrada 📈\n`;
    menu += `*2* ➜ Nova Saída 📉\n`;
    menu += `*3* ➜ Editar Transação ✏️\n`;
    menu += `*4* ➜ Recorrentes 🔄${hasRecurring ? '' : lock}\n`;
    menu += `*5* ➜ Open Banking 🏦${hasOpenBanking ? '' : lock}\n\n`;

    menu += `━━━ 📊 *Relatórios* ━━━\n`;
    menu += `*6* ➜ Relatório Mensal 📊\n`;
    menu += `*7* ➜ Exportar PDF/Excel 📤${hasExport ? '' : lock}\n`;
    menu += `*8* ➜ Metas e Orçamentos 🎯${hasBudgets ? '' : lock}\n\n`;

    menu += `━━━ ⚙️ *Conta* ━━━\n`;
    if (hasCompanies) {
      menu += `*9* ➜ Empresas 🏢\n`;
    }
    menu += `*10* ➜ Meu Plano / Upgrade 💳\n`;
    menu += `*11* ➜ Editar Perfil 👤\n`;
    menu += `*0* ➜ Sair 🔚\n\n`;

    menu += `_Digite o número da opção_ ✍️`;

    return menu;
  }
}

module.exports = new MainMenu();

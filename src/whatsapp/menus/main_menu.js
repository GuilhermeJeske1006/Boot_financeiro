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
    menu += `Plano: ${planLabel}\n\n`;

    menu += `━━━ 💸 *Lançamentos* ━━━\n`;
    menu += `*1* ➜ Nova Entrada 📈\n`;
    menu += `*2* ➜ Nova Saída 📉\n`;
    menu += `*3* ➜ Editar Transação ✏️\n`;
    menu += `*4* ➜ Últimas Transações 🕐\n`;
    menu += `*5* ➜ Recorrentes 🔄${hasRecurring ? '' : lock}\n\n`;

    menu += `━━━ 🎯 *Planejamento* ━━━\n`;
    menu += `*6* ➜ Orçamentos por Categoria 💼${hasBudgets ? '' : lock}\n`;
    menu += `*7* ➜ Metas Financeiras 🎯\n\n`;

    menu += `━━━ 📊 *Relatórios* ━━━\n`;
    menu += `*8* ➜ Relatório Mensal 📊\n`;
    menu += `*9* ➜ Exportar PDF/Excel 📤${hasExport ? '' : lock}\n\n`;

    menu += `━━━ ⚙️ *Conta* ━━━\n`;
    if (hasCompanies) {
      menu += `*10* ➜ Empresas 🏢\n`;
    }
    menu += `*11* ➜ Meu Plano / Upgrade 💳\n`;
    menu += `*12* ➜ Editar Perfil 👤\n`;
    menu += `*13* ➜ Configurações de IA 🤖\n`;
    menu += `*0* ➜ Sair 🔚\n\n`;

    menu += `_Digite o número da opção_ ✍️`;

    return menu;
  }
}

module.exports = new MainMenu();

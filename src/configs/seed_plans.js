const { Plan } = require('../models');

const defaultPlans = [
  {
    name: 'free',
    display_name: 'Grátis',
    price_brl: 0.00,
    max_transactions_per_month: 30,
    max_companies: 1,
    whatsapp_reports: false,
    pdf_export: false,
    multi_user: false,
    recurring_transactions: false,
    category_budgets: false,
    ai_chat: false,
  },
  {
    name: 'pro',
    display_name: 'Pro',
    price_brl: 19.90,
    max_transactions_per_month: -1, // ilimitado
    max_companies: 5,
    whatsapp_reports: true,
    pdf_export: true,
    multi_user: false,
    recurring_transactions: true,
    category_budgets: true,
    ai_chat: true,
  },
  {
    name: 'business',
    display_name: 'Business',
    price_brl: 49.90,
    max_transactions_per_month: -1, // ilimitado
    max_companies: -1, // ilimitado
    whatsapp_reports: true,
    pdf_export: true,
    multi_user: true,
    recurring_transactions: true,
    category_budgets: true,
    ai_chat: true,
  },
];

async function seedPlans() {
  for (const plan of defaultPlans) {
    const exists = await Plan.findOne({ where: { name: plan.name } });
    if (!exists) {
      await Plan.create(plan);
    } else {
      await exists.update(plan);
    }
  }
  console.log('Planos padrão carregados.');
}

module.exports = seedPlans;

const { Plan } = require('../models');

const defaultPlans = [
  {
    name: 'free',
    display_name: 'Grátis',
    price_brl: 0.00,
    max_transactions_per_month: 50,
    max_companies: 1,
    whatsapp_reports: false,
    pdf_export: false,
    multi_user: false,
  },
  {
    name: 'pro',
    display_name: 'Pro',
    price_brl: 29.90,
    max_transactions_per_month: -1, // ilimitado
    max_companies: 5,
    whatsapp_reports: true,
    pdf_export: true,
    multi_user: false,
  },
  {
    name: 'business',
    display_name: 'Business',
    price_brl: 79.90,
    max_transactions_per_month: -1, // ilimitado
    max_companies: -1, // ilimitado
    whatsapp_reports: true,
    pdf_export: true,
    multi_user: true,
  },
];

async function seedPlans() {
  for (const plan of defaultPlans) {
    const exists = await Plan.findOne({ where: { name: plan.name } });
    if (!exists) {
      await Plan.create(plan);
    }
  }
  console.log('Planos padrão carregados.');
}

module.exports = seedPlans;

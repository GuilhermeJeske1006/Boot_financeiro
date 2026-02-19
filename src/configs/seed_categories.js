const { Category } = require('../models');

const defaultCategories = [
  // Entradas
  { name: 'Salário', type: 'income', is_default: true },
  { name: 'Freelance', type: 'income', is_default: true },
  { name: 'Investimentos', type: 'income', is_default: true },
  { name: 'Outros', type: 'both', is_default: true },
  // Saídas
  { name: 'Alimentação', type: 'expense', is_default: true },
  { name: 'Transporte', type: 'expense', is_default: true },
  { name: 'Moradia', type: 'expense', is_default: true },
  { name: 'Saúde', type: 'expense', is_default: true },
  { name: 'Lazer', type: 'expense', is_default: true },
  { name: 'Educação', type: 'expense', is_default: true },
];

async function seedCategories() {
  for (const cat of defaultCategories) {
    const exists = await Category.findOne({ where: { name: cat.name, is_default: true } });
    if (!exists) {
      await Category.create(cat);
    }
  }
  console.log('Categorias padrão carregadas.');
}

module.exports = seedCategories;

const { Category } = require('../models');

const defaultCategories = [
  // Entradas pessoais
  { name: 'Salário', type: 'income', is_default: true, is_company: false },
  { name: 'Freelance', type: 'income', is_default: true, is_company: false },
  { name: 'Investimentos', type: 'income', is_default: true, is_company: false },
  { name: 'Outros', type: 'both', is_default: true, is_company: false },
  // Saídas pessoais
  { name: 'Alimentação', type: 'expense', is_default: true, is_company: false },
  { name: 'Transporte', type: 'expense', is_default: true, is_company: false },
  { name: 'Moradia', type: 'expense', is_default: true, is_company: false },
  { name: 'Saúde', type: 'expense', is_default: true, is_company: false },
  { name: 'Lazer', type: 'expense', is_default: true, is_company: false },
  { name: 'Educação', type: 'expense', is_default: true, is_company: false },
  // Entradas empresariais
  { name: 'Vendas', type: 'income', is_default: true, is_company: true },
  { name: 'Prestação de Serviços', type: 'income', is_default: true, is_company: true },
  { name: 'Receita Financeira', type: 'income', is_default: true, is_company: true },
  { name: 'Comissões', type: 'income', is_default: true, is_company: true },
  { name: 'Outros', type: 'both', is_default: true, is_company: true },
  // Saídas empresariais
  { name: 'Folha de Pagamento', type: 'expense', is_default: true, is_company: true },
  { name: 'Fornecedores', type: 'expense', is_default: true, is_company: true },
  { name: 'Aluguel Comercial', type: 'expense', is_default: true, is_company: true },
  { name: 'Marketing', type: 'expense', is_default: true, is_company: true },
  { name: 'Impostos e Taxas', type: 'expense', is_default: true, is_company: true },
  { name: 'Equipamentos', type: 'expense', is_default: true, is_company: true },
  { name: 'Serviços Terceirizados', type: 'expense', is_default: true, is_company: true },
];

async function seedCategories() {
  for (const cat of defaultCategories) {
    const exists = await Category.findOne({ where: { name: cat.name, is_default: true, is_company: !!cat.is_company } });
    if (!exists) {
      await Category.create(cat);
    }
  }
  console.log('Categorias padrão carregadas.');
}

module.exports = seedCategories;

const CategoryRepository = require('../repositories/category_repository');

class CategoryService {
  async create(data) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Nome da categoria é obrigatório');
    }
    if (!['income', 'expense', 'both'].includes(data.type)) {
      throw new Error('Tipo deve ser income, expense ou both');
    }
    const existing = await CategoryRepository.findByName(data.name.trim(), data.user_id);
    if (existing) {
      throw new Error('Categoria já existe');
    }
    return CategoryRepository.create({
      name: data.name.trim(),
      type: data.type,
      is_default: false,
      user_id: data.user_id,
    });
  }

  async findAll(userId) {
    return CategoryRepository.findAll(userId);
  }

  async findByType(type, userId) {
    return CategoryRepository.findByType(type, userId);
  }

  async findById(id) {
    return CategoryRepository.findById(id);
  }

  async delete(id) {
    return CategoryRepository.delete(id);
  }
}

module.exports = new CategoryService();

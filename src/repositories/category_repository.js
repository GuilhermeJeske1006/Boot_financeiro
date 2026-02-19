const { Category } = require('../models');
const { Op } = require('sequelize');

class CategoryRepository {
  async create(data) {
    return Category.create(data);
  }

  async findAll(userId) {
    return Category.findAll({
      where: {
        [Op.or]: [
          { user_id: userId },
          { is_default: true, user_id: null },
        ],
      },
      order: [['name', 'ASC']],
    });
  }

  async findByType(type, userId) {
    return Category.findAll({
      where: {
        type: { [Op.in]: [type, 'both'] },
        [Op.or]: [
          { user_id: userId },
          { is_default: true, user_id: null },
        ],
      },
      order: [['name', 'ASC']],
    });
  }

  async findById(id) {
    return Category.findByPk(id);
  }

  async findByName(name, userId) {
    return Category.findOne({
      where: {
        name,
        [Op.or]: [
          { user_id: userId },
          { is_default: true, user_id: null },
        ],
      },
    });
  }

  async delete(id) {
    const category = await Category.findByPk(id);
    if (!category) throw new Error('Categoria não encontrada');
    if (category.is_default) throw new Error('Não é possível excluir categoria padrão');
    await category.destroy();
    return true;
  }
}

module.exports = new CategoryRepository();

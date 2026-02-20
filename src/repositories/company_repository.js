const { Company, User } = require('../models');
const { Op } = require('sequelize');

class CompanyRepository {
  async create(data) {
    return Company.create(data);
  }

  async findById(id) {
    return Company.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    });
  }

  async findByUserId(userId) {
    return Company.findAll({
      where: { user_id: userId },
      order: [['name', 'ASC']],
    });
  }

  async findByCnpj(cnpj) {
    return Company.findOne({ where: { cnpj } });
  }

  async update(id, data) {
    const company = await Company.findByPk(id);
    if (!company) throw new Error('Empresa não encontrada');
    await company.update(data);
    return company;
  }

  async delete(id) {
    const company = await Company.findByPk(id);
    if (!company) throw new Error('Empresa não encontrada');
    await company.destroy();
    return true;
  }

  async list(userId) {
    return Company.findAll({
      where: { user_id: userId },
      order: [['name', 'ASC']],
    });
  }

  async checkOwnership(companyId, userId) {
    const company = await Company.findOne({
      where: { id: companyId, user_id: userId },
    });
    return !!company;
  }
}

module.exports = new CompanyRepository();

const { UserCompanyMember, User } = require('../models');
const { Op } = require('sequelize');

class UserCompanyMemberRepository {
  async create(data) {
    return UserCompanyMember.create(data);
  }

  async findByToken(token) {
    return UserCompanyMember.findOne({
      where: {
        invitation_token: token,
        status: 'invited',
        expires_at: { [Op.gt]: new Date() },
      },
    });
  }

  async findByCompany(companyId) {
    return UserCompanyMember.findAll({
      where: { company_id: companyId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }],
      order: [['created_at', 'ASC']],
    });
  }

  async findByCompanyAndUser(companyId, userId) {
    return UserCompanyMember.findOne({ where: { company_id: companyId, user_id: userId } });
  }

  async findByCompanyAndEmail(companyId, email) {
    return UserCompanyMember.findOne({ where: { company_id: companyId, invited_email: email } });
  }

  async activate(id, userId) {
    return UserCompanyMember.update(
      { status: 'active', user_id: userId, invitation_token: null },
      { where: { id } }
    );
  }

  async delete(companyId, userId) {
    return UserCompanyMember.destroy({ where: { company_id: companyId, user_id: userId } });
  }
}

module.exports = new UserCompanyMemberRepository();

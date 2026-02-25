const CompanyRepository = require('../repositories/company_repository');

class CompanyService {
  async create(data) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Nome da empresa é obrigatório');
    }
    if (!data.user_id) {
      throw new Error('Usuário é obrigatório');
    }
    if (data.cnpj) {
      if (!this._validateCnpj(data.cnpj)) {
        throw new Error('CNPJ inválido');
      }
      const existing = await CompanyRepository.findByCnpj(data.cnpj);
      if (existing) {
        throw new Error('CNPJ já cadastrado');
      }
    }
    return CompanyRepository.create({
      name: data.name.trim(),
      cnpj: data.cnpj || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      user_id: data.user_id,
    });
  }

  async findById(id) {
    const company = await CompanyRepository.findById(id);
    if (!company) {
      throw new Error('Empresa não encontrada');
    }
    return company;
  }

  async findByUserId(userId) {
    return CompanyRepository.findByUserId(userId);
  }

  async update(id, userId, data) {
    const company = await CompanyRepository.findById(id);
    if (!company) {
      throw new Error('Empresa não encontrada');
    }
    if (company.user_id !== userId) {
      throw new Error('Você não tem permissão para editar esta empresa');
    }
    if (data.name && data.name.trim() === '') {
      throw new Error('Nome da empresa é obrigatório');
    }
    if (data.cnpj && data.cnpj !== company.cnpj) {
      if (!this._validateCnpj(data.cnpj)) {
        throw new Error('CNPJ inválido');
      }
      const existing = await CompanyRepository.findByCnpj(data.cnpj);
      if (existing) {
        throw new Error('CNPJ já cadastrado');
      }
    }
    return CompanyRepository.update(id, {
      name: data.name ? data.name.trim() : company.name,
      cnpj: data.cnpj !== undefined ? data.cnpj : company.cnpj,
      email: data.email !== undefined ? data.email : company.email,
      phone: data.phone !== undefined ? data.phone : company.phone,
      address: data.address !== undefined ? data.address : company.address,
    });
  }

  async delete(id, userId) {
    const company = await CompanyRepository.findById(id);
    if (!company) {
      throw new Error('Empresa não encontrada');
    }
    if (company.user_id !== userId) {
      throw new Error('Você não tem permissão para excluir esta empresa');
    }
    return CompanyRepository.delete(id);
  }

  async list(userId) {
    return CompanyRepository.list(userId);
  }

  async checkOwnership(companyId, userId) {
    return CompanyRepository.checkOwnership(companyId, userId);
  }

  async addUser(companyId, userId) {
    const UserRepository = require('../repositories/user_respository');
    const company = await CompanyRepository.findById(companyId);
    if (!company) {
      throw new Error('Empresa não encontrada');
    }
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    return CompanyRepository.update(companyId, { user_id: userId });
  }

  _validateCnpj(cnpj) {
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;
    
    let size = cleaned.length - 2;
    let numbers = cleaned.substring(0, size);
    let digits = cleaned.substring(size);
    let sum = 0;
    let pos = size - 7;
    
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result != digits.charAt(0)) return false;
    
    size = size + 1;
    numbers = cleaned.substring(0, size);
    sum = 0;
    pos = size - 7;
    
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }
    
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result == digits.charAt(1);
  }
}

module.exports = new CompanyService();

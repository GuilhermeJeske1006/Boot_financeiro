const CompanyService = require('../services/company_service');

class CompanyController {
  async create(req, res) {
    try {
      const company = await CompanyService.create({
        ...req.body,
        user_id: req.userId,
      });
      return res.status(201).json({
        message: 'Empresa criada com sucesso',
        company: {
          id: company.id,
          name: company.name,
          cnpj: company.cnpj,
          email: company.email,
          phone: company.phone,
          address: company.address,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async findAll(req, res) {
    try {
      const companies = await CompanyService.list(req.userId);
      return res.json(companies);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async findById(req, res) {
    try {
      const company = await CompanyService.findById(req.params.id);
      if (company.user_id !== req.userId) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar esta empresa' });
      }
      return res.json(company);
    } catch (error) {
      console.log(error);
      return res.status(404).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const company = await CompanyService.update(req.params.id, req.userId, req.body);
      return res.json({
        message: 'Empresa atualizada com sucesso',
        company: {
          id: company.id,
          name: company.name,
          cnpj: company.cnpj,
          email: company.email,
          phone: company.phone,
          address: company.address,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      await CompanyService.delete(req.params.id, req.userId);
      return res.json({ message: 'Empresa excluída com sucesso' });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new CompanyController();

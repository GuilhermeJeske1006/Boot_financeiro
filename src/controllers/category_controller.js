const CategoryService = require('../services/category_service');

class CategoryController {
  async findAll(req, res) {
    try {
      const { type } = req.query;
      const categories = type
        ? await CategoryService.findByType(type, req.userId)
        : await CategoryService.findAll(req.userId);
      return res.json(categories);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new CategoryController();

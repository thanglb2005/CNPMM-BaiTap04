const Category = require('./category.model');
const { HttpResponse } = require('../../shared/utils/apiResponse');
const { AppException } = require('../../shared/errors/AppError');

const getAllCategories = async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 });
  res.status(200).json(HttpResponse.success(categories, 'Lấy danh sách danh mục thành công'));
};

const getCategoryBySlug = async (req, res) => {
  const { slug } = req.params;
  const category = await Category.findOne({ slug, isActive: true });
  
  if (!category) {
    throw new AppException('Không tìm thấy danh mục', 404);
  }
  
  res.status(200).json(HttpResponse.success(category, 'Lấy thông tin danh mục thành công'));
};

const getFeaturedCategories = async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ order: 1 })
    .limit(6);
  res.status(200).json(HttpResponse.success(categories, 'Lấy danh mục nổi bật thành công'));
};

module.exports = {
  getAllCategories,
  getCategoryBySlug,
  getFeaturedCategories,
};

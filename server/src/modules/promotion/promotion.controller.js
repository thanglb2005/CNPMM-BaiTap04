const Promotion = require('./promotion.model');
const { HttpResponse } = require('../../shared/utils/apiResponse');
const { AppException } = require('../../shared/errors/AppError');

const getActivePromotions = async (req, res) => {
  const now = new Date();
  
  const promotions = await Promotion.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(HttpResponse.success(promotions, 'Lấy danh sách khuyến mãi thành công'));
};

const getFeaturedPromotions = async (req, res) => {
  const { limit = 5 } = req.query;
  const now = new Date();
  
  const promotions = await Promotion.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  res.status(200).json(HttpResponse.success(promotions, 'Lấy khuyến mãi nổi bật thành công'));
};

const getPromotionBySlug = async (req, res) => {
  const { slug } = req.params;
  const now = new Date();
  
  const promotion = await Promotion.findOne({
    slug,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();

  if (!promotion) {
    throw new AppException('Không tìm thấy khuyến mãi', 404);
  }

  res.status(200).json(HttpResponse.success(promotion, 'Lấy thông tin khuyến mãi thành công'));
};

module.exports = {
  getActivePromotions,
  getFeaturedPromotions,
  getPromotionBySlug,
};

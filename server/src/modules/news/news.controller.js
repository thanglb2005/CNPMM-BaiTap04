const News = require('./news.model');
const { HttpResponse } = require('../../shared/utils/apiResponse');
const { AppException } = require('../../shared/errors/AppError');

const getNews = async (req, res) => {
  const { page = 1, limit = 10, category } = req.query;

  const query = { isActive: true };
  if (category) {
    query.category = category;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [news, total] = await Promise.all([
    News.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    News.countDocuments(query),
  ]);

  res.status(200).json(HttpResponse.success({
    news,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  }, 'Lấy danh sách tin tức thành công'));
};

const getFeaturedNews = async (req, res) => {
  const { limit = 5 } = req.query;
  
  const news = await News.find({ isActive: true, isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  res.status(200).json(HttpResponse.success(news, 'Lấy tin tức nổi bật thành công'));
};

const getLatestNews = async (req, res) => {
  const { limit = 5 } = req.query;
  
  const news = await News.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  res.status(200).json(HttpResponse.success(news, 'Lấy tin tức mới nhất thành công'));
};

const getNewsBySlug = async (req, res) => {
  const { slug } = req.params;
  
  const article = await News.findOneAndUpdate(
    { slug, isActive: true },
    { $inc: { viewCount: 1 } },
    { new: true }
  ).lean();

  if (!article) {
    throw new AppException('Không tìm thấy tin tức', 404);
  }

  res.status(200).json(HttpResponse.success(article, 'Lấy thông tin tin tức thành công'));
};

module.exports = {
  getNews,
  getFeaturedNews,
  getLatestNews,
  getNewsBySlug,
};

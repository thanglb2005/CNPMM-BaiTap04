const RecentlyViewed = require('./recentlyViewed.model');
const Product = require('../product/product.model');
const Review = require('../review/review.model');
const Favorite = require('../favorite/favorite.model');
const Order = require('../order/order.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// GET /api/recently-viewed - Get user's recently viewed products
const getRecentlyViewed = async (req, res) => {
  const userId = req.user._id;
  const { limit = 10 } = req.query;

  const products = await RecentlyViewed.getRecentlyViewed(userId, Number(limit));

  res.status(200).json(ApiResponse.success(products, 'Lấy danh sách sản phẩm đã xem thành công'));
};

// POST /api/recently-viewed/:productId - Add product to recently viewed
const addToRecentlyViewed = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  // Verify product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Không tìm thấy sản phẩm', 404);
  }

  await RecentlyViewed.addProduct(userId, productId);

  res.status(200).json(ApiResponse.success({ added: true }, 'Đã thêm vào sản phẩm đã xem'));
};

// DELETE /api/recently-viewed/:productId - Remove from recently viewed
const removeFromRecentlyViewed = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  await RecentlyViewed.removeProduct(userId, productId);

  res.status(200).json(ApiResponse.success(null, 'Đã xóa khỏi sản phẩm đã xem'));
};

// DELETE /api/recently-viewed - Clear all recently viewed
const clearRecentlyViewed = async (req, res) => {
  const userId = req.user._id;
  await RecentlyViewed.clearAll(userId);
  res.status(200).json(ApiResponse.success(null, 'Đã xóa tất cả sản phẩm đã xem'));
};

// GET /api/products/stats/:productId - Get product stats (buyer count, reviewer count)
const getProductStats = async (req, res) => {
  const { productId } = req.params;

  const [buyerCount, reviewerCount, favoriteCount] = await Promise.all([
    // Count unique buyers (from delivered/confirmed orders)
    Order.countDocuments({
      'items.productId': productId,
      orderStatus: { $in: ['delivered', 'confirmed', 'preparing', 'shipping'] },
    }),
    // Count unique reviewers
    Review.countDocuments({ productId, isHidden: false }),
    // Count favorites
    Favorite.countDocuments({ productId }),
  ]);

  res.status(200).json(
    ApiResponse.success({
      buyerCount,
      reviewerCount,
      favoriteCount,
    })
  );
};

// GET /api/products/similar/:productId - Get similar products
const getSimilarProducts = async (req, res) => {
  const { productId } = req.params;
  const { limit = 8 } = req.query;

  const product = await Product.findById(productId).populate('category', 'name slug');
  if (!product) {
    throw new AppError('Không tìm thấy sản phẩm', 404);
  }

  const products = await Product.find({
    isActive: true,
    _id: { $ne: productId },
    $or: [
      { category: product.category._id },
      { author: { $regex: product.author, $options: 'i' } },
    ],
  })
    .populate('category', 'name slug')
    .sort({ soldQuantity: -1, rating: -1 })
    .limit(Number(limit))
    .lean();

  res.status(200).json(ApiResponse.success(products, 'Lấy sản phẩm tương tự thành công'));
};

module.exports = {
  getRecentlyViewed,
  addToRecentlyViewed,
  removeFromRecentlyViewed,
  clearRecentlyViewed,
  getProductStats,
  getSimilarProducts,
};

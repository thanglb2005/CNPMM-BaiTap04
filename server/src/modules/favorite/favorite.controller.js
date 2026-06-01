const Favorite = require('./favorite.model');
const Product = require('../product/product.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// GET /api/favorites - Get user's favorites
const getMyFavorites = async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 12, sortBy = 'createdAt', order = 'desc' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const sortOptions = { [sortBy]: order === 'asc' ? 1 : -1 };

  const [favorites, total] = await Promise.all([
    Favorite.find({ userId })
      .populate({
        path: 'productId',
        match: { isActive: true },
        select: 'name slug coverImage price salePrice rating reviewCount soldQuantity stockQuantity author',
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Favorite.countDocuments({ userId }),
  ]);

  // Filter out null products (inactive/deleted)
  const products = favorites
    .filter((f) => f.productId !== null)
    .map((f) => ({ ...f.productId, favoritedAt: f.createdAt }));

  res.status(200).json(
    ApiResponse.success(
      {
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      'Lấy danh sách sản phẩm yêu thích thành công'
    )
  );
};

// POST /api/favorites/toggle/:productId - Toggle favorite
const toggleFavorite = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Không tìm thấy sản phẩm', 404);
  }

  const result = await Favorite.toggle(userId, productId);

  res.status(200).json(
    ApiResponse.success(
      {
        action: result.action,
        isFavorite: result.action === 'added',
      },
      result.action === 'added' ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích'
    )
  );
};

// DELETE /api/favorites/:productId - Remove from favorites
const removeFavorite = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  const result = await Favorite.deleteOne({ userId, productId });
  if (result.deletedCount === 0) {
    throw new AppError('Sản phẩm không có trong danh sách yêu thích', 404);
  }

  res.status(200).json(ApiResponse.success(null, 'Đã xóa khỏi danh sách yêu thích'));
};

// DELETE /api/favorites - Clear all favorites
const clearAllFavorites = async (req, res) => {
  const userId = req.user._id;
  await Favorite.deleteMany({ userId });
  res.status(200).json(ApiResponse.success(null, 'Đã xóa tất cả sản phẩm yêu thích'));
};

// GET /api/favorites/check/:productId - Check if product is favorited
const checkFavorite = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  const favorite = await Favorite.findOne({ userId, productId });
  res.status(200).json(
    ApiResponse.success({
      isFavorite: !!favorite,
      favoritedAt: favorite?.createdAt || null,
    })
  );
};

// GET /api/favorites/count - Get favorites count
const getFavoritesCount = async (req, res) => {
  const userId = req.user._id;
  const count = await Favorite.countDocuments({ userId });
  res.status(200).json(ApiResponse.success({ count }));
};

// GET /api/favorites/bulk-check - Check multiple products
const checkMultipleFavorites = async (req, res) => {
  const userId = req.user._id;
  const { productIds } = req.body;

  if (!productIds || !Array.isArray(productIds)) {
    throw new AppError('Danh sách ID sản phẩm không hợp lệ', 400);
  }

  const favorites = await Favorite.find({
    userId,
    productId: { $in: productIds },
  }).select('productId createdAt');

  const favoriteMap = {};
  favorites.forEach((f) => {
    favoriteMap[f.productId.toString()] = {
      isFavorite: true,
      favoritedAt: f.createdAt,
    };
  });

  const results = productIds.map((id) => ({
    productId: id,
    isFavorite: !!favoriteMap[id],
    favoritedAt: favoriteMap[id]?.favoritedAt || null,
  }));

  res.status(200).json(ApiResponse.success(results));
};

module.exports = {
  getMyFavorites,
  toggleFavorite,
  removeFavorite,
  clearAllFavorites,
  checkFavorite,
  getFavoritesCount,
  checkMultipleFavorites,
};

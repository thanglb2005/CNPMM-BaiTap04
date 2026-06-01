const Review = require('./review.model');
const Product = require('../product/product.model');
const Order = require('../order/order.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// Helper to check if user purchased this product (verified purchase)
const checkVerifiedPurchase = async (userId, productId) => {
  const order = await Order.findOne({
    userId,
    'items.productId': productId,
    orderStatus: { $in: ['delivered', 'confirmed', 'preparing', 'shipping'] },
  });
  return !!order;
};

// Helper to get reward config
const getReviewRewardConfig = () => {
  return {
    pointsReward: 50,
    couponReward: true,
    couponDiscount: 10,
    couponMinOrder: 100000,
    couponValidDays: 30,
  };
};

// GET /api/reviews/product/:productId - Get reviews for a product
const getProductReviews = async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', rating } = req.query;

  const query = { productId, isHidden: false };
  if (rating) {
    query.rating = Number(rating);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('userId', 'username avatar')
      .populate('orderId', 'orderNumber')
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Review.countDocuments(query),
  ]);

  // Get rating distribution
  const ratingDistribution = await Review.aggregate([
    { $match: { productId: new (require('mongoose').Types.ObjectId)(productId), isHidden: false } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratingDistribution.forEach((item) => {
    distribution[item._id] = item.count;
  });

  res.status(200).json(
    ApiResponse.success(
      {
        reviews,
        ratingDistribution: distribution,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      'Lấy danh sách đánh giá thành công'
    )
  );
};

// GET /api/reviews/user - Get current user's reviews
const getMyReviews = async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    Review.find({ userId })
      .populate('productId', 'name slug coverImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Review.countDocuments({ userId }),
  ]);

  res.status(200).json(
    ApiResponse.success(
      {
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      'Lấy danh sách đánh giá của bạn thành công'
    )
  );
};

// GET /api/reviews/:id - Get single review
const getReviewById = async (req, res) => {
  const { id } = req.params;
  const review = await Review.findById(id)
    .populate('userId', 'username avatar')
    .populate('productId', 'name slug coverImage')
    .lean();

  if (!review) {
    throw new AppError('Không tìm thấy đánh giá', 404);
  }

  res.status(200).json(ApiResponse.success(review, 'Lấy thông tin đánh giá thành công'));
};

// POST /api/reviews - Create a new review
const createReview = async (req, res) => {
  const userId = req.user._id;
  const { productId, rating, title, content, images } = req.body;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Không tìm thấy sản phẩm', 404);
  }

  // Check if user already reviewed this product
  const existingReview = await Review.findOne({ userId, productId });
  if (existingReview) {
    throw new AppError('Bạn đã đánh giá sản phẩm này rồi', 400);
  }

  // Check verified purchase
  const isVerifiedPurchase = await checkVerifiedPurchase(userId, productId);

  const review = await Review.create({
    userId,
    productId,
    rating,
    title: title || '',
    content,
    images: images || [],
    isVerifiedPurchase,
  });

  // Update product rating
  await Review.updateProductRating(productId);

  // Populate user info for response
  await review.populate('userId', 'username avatar');

  // Give reward if verified purchase
  let reward = null;
  if (isVerifiedPurchase) {
    reward = getReviewRewardConfig();
    // Add points to user
    const { UserPoint } = require('../loyalty/userPoint.model');
    const { POINT_TRANSACTION_TYPES } = require('../loyalty/loyaltyHistory.model');
    const LoyaltyHistory = require('../loyalty/loyaltyHistory.model');

    const userPoint = await UserPoint.getOrCreate(userId);
    await userPoint.addPoints(reward.pointsReward, `Đánh giá sản phẩm: ${product.name}`);

    // Also create a coupon reward
    const Coupon = require('../coupon/coupon.model');
    const UserCoupon = require('../coupon/userCoupon.model');
    const code = Coupon.generateCode('REV');
    const coupon = await Coupon.create({
      code,
      name: `Mã giảm giá đánh giá sản phẩm`,
      description: `Tặng 10% cho đơn hàng từ 100,000đ - Thưởng đánh giá sản phẩm ${product.name}`,
      couponType: 'percentage',
      discountValue: 10,
      minOrderAmount: 100000,
      maxDiscountAmount: 50000,
      maxUsageCount: 1,
      maxUsagePerUser: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      isPublic: false,
      assignedUserIds: [userId],
    });

    await UserCoupon.create({
      userId,
      couponId: coupon._id,
      acquiredFrom: 'review_reward',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  res.status(201).json(
    ApiResponse.success(
      { review, reward },
      isVerifiedPurchase
        ? 'Cảm ơn bạn! Đánh giá thành công. Bạn được tặng 50 điểm và 1 mã giảm giá 10%!'
        : 'Đánh giá thành công! Hãy tiếp tục mua sắm để nhận thêm phần thưởng.'
    )
  );
};

// PUT /api/reviews/:id - Update a review
const updateReview = async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  const { rating, title, content, images } = req.body;

  const review = await Review.findOne({ _id: id, userId });
  if (!review) {
    throw new AppError('Không tìm thấy đánh giá hoặc bạn không có quyền sửa', 404);
  }

  if (!review.canBeEdited()) {
    throw new AppError('Đánh giá không thể chỉnh sửa sau 7 ngày', 400);
  }

  if (rating) review.rating = rating;
  if (title !== undefined) review.title = title;
  if (content) review.content = content;
  if (images) review.images = images;
  review.isEdited = true;

  await review.save();
  await Review.updateProductRating(review.productId);

  await review.populate('userId', 'username avatar');

  res.status(200).json(ApiResponse.success(review, 'Cập nhật đánh giá thành công'));
};

// DELETE /api/reviews/:id - Delete a review
const deleteReview = async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const review = await Review.findOne({ _id: id, userId });
  if (!review) {
    throw new AppError('Không tìm thấy đánh giá hoặc bạn không có quyền xóa', 404);
  }

  const productId = review.productId;
  await review.deleteOne();
  await Review.updateProductRating(productId);

  res.status(200).json(ApiResponse.success(null, 'Xóa đánh giá thành công'));
};

// GET /api/reviews/can-review/:productId - Check if user can review product
const canReview = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  const existingReview = await Review.findOne({ userId, productId });
  if (existingReview) {
    return res.status(200).json(
      ApiResponse.success({
        canReview: false,
        reason: 'already_reviewed',
        existingReview: existingReview._id,
      })
    );
  }

  const isVerifiedPurchase = await checkVerifiedPurchase(userId, productId);

  res.status(200).json(
    ApiResponse.success({
      canReview: true,
      isVerifiedPurchase,
      reward: getReviewRewardConfig(),
    })
  );
};

module.exports = {
  getProductReviews,
  getMyReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  canReview,
};

const { UserPoint } = require('./userPoint.model');
const { LoyaltyHistory, POINT_TRANSACTION_TYPES, POINT_VALUES } = require('./loyaltyHistory.model');
const Coupon = require('../coupon/coupon.model');
const UserCoupon = require('../coupon/userCoupon.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// GET /api/loyalty/points - Get current user's points balance
const getMyPoints = async (req, res) => {
  const userId = req.user._id;
  const userPoint = await UserPoint.getOrCreate(userId);

  const tierInfo = UserPoint.getNextTier(userPoint.tier);

  res.status(200).json(
    ApiResponse.success({
      currentBalance: userPoint.currentBalance,
      lifetimeEarned: userPoint.lifetimeEarned,
      lifetimeRedeemed: userPoint.lifetimeRedeemed,
      tier: userPoint.tier,
      tierPoints: userPoint.tierPoints,
      nextTierAt: tierInfo?.nextTier,
      pointsToNextTier: tierInfo ? tierInfo.pointsNeeded - userPoint.lifetimeEarned : null,
      tierThresholds: UserPoint.getTierThresholds(),
      pointValues: POINT_VALUES,
    })
  );
};

// GET /api/loyalty/history - Get points history
const getPointsHistory = async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, type } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = { userId };
  if (type) {
    query.type = type;
  }

  const [history, total] = await Promise.all([
    LoyaltyHistory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    LoyaltyHistory.countDocuments(query),
  ]);

  res.status(200).json(
    ApiResponse.success({
      history,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  );
};

// POST /api/loyalty/redeem - Redeem points for coupon
const redeemPoints = async (req, res) => {
  const userId = req.user._id;
  const { points, couponValue } = req.body;

  if (!points || points < POINT_VALUES.MIN_POINTS_REDEEM) {
    throw new AppError(`Tối thiểu ${POINT_VALUES.MIN_POINTS_REDEEM} điểm để đổi`, 400);
  }

  const userPoint = await UserPoint.getOrCreate(userId);
  if (userPoint.currentBalance < points) {
    throw new AppError('Số dư điểm không đủ', 400);
  }

  // Calculate coupon value (1000 points = 10,000 VND discount)
  const couponDiscount = Math.floor(points / 100) * 1000;
  const minOrderAmount = couponDiscount * 10;

  // Generate coupon code
  const code = Coupon.generateCode('PNT');

  // Create coupon
  const coupon = await Coupon.create({
    code,
    name: `Mã giảm giá đổi ${points} điểm`,
    description: `Giảm ${couponDiscount.toLocaleString('vi-VN')}đ cho đơn hàng từ ${minOrderAmount.toLocaleString('vi-VN')}đ`,
    couponType: 'fixed_amount',
    discountValue: couponDiscount,
    minOrderAmount,
    maxUsageCount: 1,
    maxUsagePerUser: 1,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    isActive: true,
    isPublic: false,
    assignedUserIds: [userId],
  });

  // Create user coupon
  await UserCoupon.create({
    userId,
    couponId: coupon._id,
    acquiredFrom: 'manual',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  // Deduct points
  await userPoint.deductPoints(points, `Đổi điểm lấy mã giảm giá ${code}`);

  res.status(200).json(
    ApiResponse.success(
      {
        coupon: {
          code: coupon.code,
          name: coupon.name,
          discountValue: coupon.discountValue,
          minOrderAmount: coupon.minOrderAmount,
          expiresAt: coupon.endDate,
        },
        pointsDeducted: points,
        newBalance: userPoint.currentBalance,
      },
      `Đổi điểm thành công! Mã giảm giá đã được thêm vào tài khoản.`
    )
  );
};

// POST /api/loyalty/redeem-free-shipping - Redeem points for free shipping
const redeemFreeShipping = async (req, res) => {
  const userId = req.user._id;
  const pointsCost = 500;

  const userPoint = await UserPoint.getOrCreate(userId);
  if (userPoint.currentBalance < pointsCost) {
    throw new AppError(`Cần ${pointsCost} điểm để đổi miễn phí vận chuyển`, 400);
  }

  // Generate free shipping coupon
  const code = Coupon.generateCode('SHIP');

  const coupon = await Coupon.create({
    code,
    name: `Miễn phí vận chuyển - Đổi ${pointsCost} điểm`,
    description: 'Miễn phí vận chuyển cho đơn hàng từ 100,000đ',
    couponType: 'free_shipping',
    discountValue: 0,
    minOrderAmount: 100000,
    maxUsageCount: 1,
    maxUsagePerUser: 1,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    isActive: true,
    isPublic: false,
    assignedUserIds: [userId],
  });

  await UserCoupon.create({
    userId,
    couponId: coupon._id,
    acquiredFrom: 'manual',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await userPoint.deductPoints(pointsCost, `Đổi điểm lấy mã miễn phí vận chuyển ${code}`);

  res.status(200).json(
    ApiResponse.success(
      {
        coupon: {
          code: coupon.code,
          name: coupon.name,
          expiresAt: coupon.endDate,
        },
        pointsDeducted: pointsCost,
        newBalance: userPoint.currentBalance,
      },
      `Đổi điểm thành công! Mã miễn phí vận chuyển đã được thêm vào tài khoản.`
    )
  );
};

// GET /api/loyalty/rewards - Get available rewards for redemption
const getAvailableRewards = async (req, res) => {
  const userPoint = await UserPoint.getOrCreate(req.user._id);

  const rewards = [
    {
      id: 'coupon_10k',
      name: 'Mã giảm 10,000đ',
      description: 'Giảm 10,000đ cho đơn hàng từ 100,000đ',
      pointsCost: 1000,
      type: 'fixed_amount',
      discountValue: 10000,
      minOrder: 100000,
    },
    {
      id: 'coupon_20k',
      name: 'Mã giảm 20,000đ',
      description: 'Giảm 20,000đ cho đơn hàng từ 200,000đ',
      pointsCost: 2000,
      type: 'fixed_amount',
      discountValue: 20000,
      minOrder: 200000,
    },
    {
      id: 'coupon_50k',
      name: 'Mã giảm 50,000đ',
      description: 'Giảm 50,000đ cho đơn hàng từ 500,000đ',
      pointsCost: 5000,
      type: 'fixed_amount',
      discountValue: 50000,
      minOrder: 500000,
    },
    {
      id: 'coupon_100k',
      name: 'Mã giảm 100,000đ',
      description: 'Giảm 100,000đ cho đơn hàng từ 1,000,000đ',
      pointsCost: 10000,
      type: 'fixed_amount',
      discountValue: 100000,
      minOrder: 1000000,
    },
    {
      id: 'free_shipping',
      name: 'Miễn phí vận chuyển',
      description: 'Miễn phí vận chuyển cho đơn hàng từ 100,000đ',
      pointsCost: 500,
      type: 'free_shipping',
      discountValue: 0,
      minOrder: 100000,
    },
  ];

  res.status(200).json(
    ApiResponse.success({
      currentBalance: userPoint.currentBalance,
      rewards: rewards.map((r) => ({
        ...r,
        canRedeem: userPoint.currentBalance >= r.pointsCost,
      })),
    })
  );
};

// POST /api/loyalty/redeem-reward - Redeem a specific reward
const redeemReward = async (req, res) => {
  const userId = req.user._id;
  const { rewardId } = req.body;

  const rewards = {
    coupon_10k: { pointsCost: 1000, discount: 10000, minOrder: 100000 },
    coupon_20k: { pointsCost: 2000, discount: 20000, minOrder: 200000 },
    coupon_50k: { pointsCost: 5000, discount: 50000, minOrder: 500000 },
    coupon_100k: { pointsCost: 10000, discount: 100000, minOrder: 1000000 },
    free_shipping: { pointsCost: 500, discount: 0, minOrder: 100000, type: 'free_shipping' },
  };

  const reward = rewards[rewardId];
  if (!reward) {
    throw new AppError('Phần thưởng không hợp lệ', 400);
  }

  const userPoint = await UserPoint.getOrCreate(userId);
  if (userPoint.currentBalance < reward.pointsCost) {
    throw new AppError('Số dư điểm không đủ', 400);
  }

  const code = Coupon.generateCode(reward.type === 'free_shipping' ? 'SHIP' : 'PNT');

  const coupon = await Coupon.create({
    code,
    name:
      reward.type === 'free_shipping'
        ? `Miễn phí vận chuyển - Đổi ${reward.pointsCost} điểm`
        : `Mã giảm ${reward.discount.toLocaleString('vi-VN')}đ - Đổi ${reward.pointsCost} điểm`,
    description:
      reward.type === 'free_shipping'
        ? 'Miễn phí vận chuyển cho đơn hàng từ 100,000đ'
        : `Giảm ${reward.discount.toLocaleString('vi-VN')}đ cho đơn hàng từ ${reward.minOrder.toLocaleString('vi-VN')}đ`,
    couponType: reward.type === 'free_shipping' ? 'free_shipping' : 'fixed_amount',
    discountValue: reward.discount,
    minOrderAmount: reward.minOrder,
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
    acquiredFrom: 'manual',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  await userPoint.deductPoints(reward.pointsCost, `Đổi điểm lấy phần thưởng ${rewardId}`);

  res.status(200).json(
    ApiResponse.success(
      {
        coupon: {
          code: coupon.code,
          name: coupon.name,
          discountValue: coupon.discountValue,
          minOrderAmount: coupon.minOrderAmount,
          expiresAt: coupon.endDate,
        },
        pointsDeducted: reward.pointsCost,
        newBalance: userPoint.currentBalance,
      },
      `Đổi phần thưởng thành công! Mã giảm giá đã được thêm vào tài khoản.`
    )
  );
};

// POST /api/loyalty/earn-from-purchase - Add points after purchase (called internally)
const earnPointsFromPurchase = async (userId, orderTotal, orderId) => {
  const pointsEarned = Math.floor(orderTotal / 1000) * POINT_VALUES.PURCHASE_PER_1000;
  if (pointsEarned <= 0) return null;

  const userPoint = await UserPoint.getOrCreate(userId);
  await userPoint.addPoints(pointsEarned, `Mua hàng - Đơn hàng #${orderId}`);

  return pointsEarned;
};

module.exports = {
  getMyPoints,
  getPointsHistory,
  redeemPoints,
  redeemFreeShipping,
  getAvailableRewards,
  redeemReward,
  earnPointsFromPurchase,
  POINT_TRANSACTION_TYPES,
  POINT_VALUES,
};

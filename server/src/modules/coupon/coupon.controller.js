const Coupon = require('./coupon.model');
const UserCoupon = require('./userCoupon.model');
const Product = require('../product/product.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// GET /api/coupons - Get available public coupons
const getPublicCoupons = async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    isPublic: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { maxUsageCount: null },
      { $expr: { $lt: ['$usedCount', '$maxUsageCount'] } },
    ],
  })
    .sort({ discountValue: -1 })
    .lean();

  res.status(200).json(ApiResponse.success(coupons, 'Lấy danh sách phiếu giảm giá thành công'));
};

// GET /api/coupons/my - Get user's coupons
const getMyCoupons = async (req, res) => {
  const userId = req.user._id;
  const { status = 'available' } = req.query;

  const query = { userId };

  if (status === 'available') {
    query.status = 'available';
    query.$or = [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }];
  } else {
    query.status = status;
  }

  const userCoupons = await UserCoupon.find(query)
    .populate({
      path: 'couponId',
      select: 'code name description couponType discountValue maxDiscountAmount minOrderAmount endDate',
    })
    .sort({ createdAt: -1 })
    .lean();

  // Filter valid coupons for available status
  const validCoupons = userCoupons
    .filter((uc) => {
      if (!uc.couponId) return false;
      if (status === 'available') {
        return uc.couponId.isValid;
      }
      return true;
    })
    .map((uc) => ({
      ...uc.couponId,
      userCouponId: uc._id,
      status: uc.status,
      acquiredFrom: uc.acquiredFrom,
      usedAt: uc.usedAt,
      expiresAt: uc.expiresAt,
    }));

  res.status(200).json(ApiResponse.success(validCoupons, 'Lấy danh sách phiếu giảm giá thành công'));
};

// GET /api/coupons/:code - Get coupon by code
const getCouponByCode = async (req, res) => {
  const { code } = req.params;
  const coupon = await Coupon.findOne({ code: code.toUpperCase() }).lean();

  if (!coupon) {
    throw new AppError('Không tìm thấy mã phiếu giảm giá', 404);
  }

  res.status(200).json(ApiResponse.success(coupon, 'Lấy thông tin phiếu giảm giá thành công'));
};

// POST /api/coupons/apply - Apply coupon to order
const applyCoupon = async (req, res) => {
  const userId = req.user._id;
  const { code, orderAmount, productIds } = req.body;

  if (!code) {
    throw new AppError('Mã phiếu giảm giá là bắt buộc', 400);
  }

  if (!orderAmount || orderAmount <= 0) {
    throw new AppError('Số tiền đơn hàng không hợp lệ', 400);
  }

  // Find coupon
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) {
    throw new AppError('Mã phiếu giảm giá không tồn tại', 404);
  }

  if (!coupon.isValid) {
    if (new Date() < coupon.startDate) {
      throw new AppError('Mã phiếu giảm giá chưa có hiệu lực', 400);
    }
    if (new Date() > coupon.endDate) {
      throw new AppError('Mã phiếu giảm giá đã hết hạn', 400);
    }
    if (coupon.maxUsageCount && coupon.usedCount >= coupon.maxUsageCount) {
      throw new AppError('Mã phiếu giảm giá đã hết lượt sử dụng', 400);
    }
    throw new AppError('Mã phiếu giảm giá không hợp lệ', 400);
  }

  // Check user-specific coupon
  if (!coupon.isPublic && !coupon.assignedUserIds.includes(userId)) {
    throw new AppError('Bạn không có quyền sử dụng mã phiếu giảm giá này', 403);
  }

  // Check min order amount
  if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
    throw new AppError(`Đơn hàng tối thiểu ${coupon.minOrderAmount.toLocaleString('vi-VN')}đ`, 400);
  }

  // Check product restrictions
  if (coupon.productIds.length > 0 && productIds && productIds.length > 0) {
    const hasValidProduct = productIds.some((pid) => coupon.productIds.includes(pid));
    if (!hasValidProduct) {
      throw new AppError('Mã phiếu giảm giá không áp dụng cho sản phẩm này', 400);
    }
  }

  // Calculate discount
  const discount = coupon.calculateDiscount(orderAmount, productIds);

  res.status(200).json(
    ApiResponse.success(
      {
        coupon: {
          code: coupon.code,
          name: coupon.name,
          type: coupon.couponType,
          discountValue: coupon.discountValue,
        },
        discount,
        originalAmount: orderAmount,
        finalAmount: orderAmount - discount,
      },
      'Áp dụng mã giảm giá thành công'
    )
  );
};

// POST /api/coupons/claim/:couponId - Claim a public coupon
const claimCoupon = async (req, res) => {
  const userId = req.user._id;
  const { couponId } = req.params;

  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    throw new AppError('Không tìm thấy phiếu giảm giá', 404);
  }

  if (!coupon.isValid) {
    throw new AppError('Phiếu giảm giá không còn khả dụng', 400);
  }

  if (!coupon.isPublic) {
    throw new AppError('Phiếu giảm giá này không khả dụng', 400);
  }

  // Check if user already has this coupon
  const existingUserCoupon = await UserCoupon.findOne({ userId, couponId });
  if (existingUserCoupon) {
    throw new AppError('Bạn đã nhận phiếu giảm giá này rồi', 400);
  }

  // Check max usage per user
  const userCouponCount = await UserCoupon.countDocuments({ userId, couponId });
  if (userCouponCount >= coupon.maxUsagePerUser) {
    throw new AppError('Bạn đã nhận đủ số lượng phiếu giảm giá này', 400);
  }

  // Create user coupon
  const expiresAt = new Date(coupon.endDate);
  await UserCoupon.create({
    userId,
    couponId,
    acquiredFrom: 'system',
    expiresAt,
  });

  res.status(200).json(
    ApiResponse.success(
      { expiresAt },
      'Nhận phiếu giảm giá thành công! Vui lòng kiểm tra trong "Phiếu giảm giá của tôi".'
    )
  );
};

// Admin routes
const getAllCoupons = async (req, res) => {
  const { page = 1, limit = 20, isActive, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = {};
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }
  if (search) {
    query.$or = [
      { code: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  const [coupons, total] = await Promise.all([
    Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Coupon.countDocuments(query),
  ]);

  res.status(200).json(
    ApiResponse.success({
      coupons,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  );
};

const createCoupon = async (req, res) => {
  const couponData = req.body;
  couponData.createdBy = req.user._id;

  if (!couponData.code) {
    couponData.code = Coupon.generateCode();
  }

  const coupon = await Coupon.create(couponData);
  res.status(201).json(ApiResponse.success(coupon, 'Tạo phiếu giảm giá thành công'));
};

const updateCoupon = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const coupon = await Coupon.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!coupon) {
    throw new AppError('Không tìm thấy phiếu giảm giá', 404);
  }

  res.status(200).json(ApiResponse.success(coupon, 'Cập nhật phiếu giảm giá thành công'));
};

const deleteCoupon = async (req, res) => {
  const { id } = req.params;
  await Coupon.findByIdAndDelete(id);
  await UserCoupon.deleteMany({ couponId: id });
  res.status(200).json(ApiResponse.success(null, 'Xóa phiếu giảm giá thành công'));
};

module.exports = {
  getPublicCoupons,
  getMyCoupons,
  getCouponByCode,
  applyCoupon,
  claimCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};

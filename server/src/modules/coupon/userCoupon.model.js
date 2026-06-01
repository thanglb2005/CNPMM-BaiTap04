const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserCouponSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ID người dùng là bắt buộc'],
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      required: [true, 'ID phiếu giảm giá là bắt buộc'],
    },
    acquiredFrom: {
      type: String,
      enum: ['system', 'purchase_reward', 'review_reward', 'manual', 'admin'],
      default: 'system',
    },
    status: {
      type: String,
      enum: ['available', 'used', 'expired'],
      default: 'available',
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
UserCouponSchema.index({ userId: 1, couponId: 1 }, { unique: true });
UserCouponSchema.index({ userId: 1, status: 1, expiresAt: 1 });
UserCouponSchema.index({ couponId: 1 });

// Check if user can use this coupon
UserCouponSchema.methods.canBeUsed = function () {
  if (this.status !== 'available') return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
};

// Static method to get user's available coupons
UserCouponSchema.statics.getAvailableCoupons = async function (userId) {
  const UserCoupon = this;
  const Coupon = mongoose.model('Coupon');

  const userCoupons = await UserCoupon.find({
    userId,
    status: 'available',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  })
    .populate('couponId')
    .lean();

  // Filter out expired coupons and coupons that are no longer valid
  return userCoupons.filter((uc) => {
    if (!uc.couponId) return false;
    return uc.couponId.isValid;
  });
};

const UserCoupon = mongoose.model('UserCoupon', UserCouponSchema);

module.exports = UserCoupon;

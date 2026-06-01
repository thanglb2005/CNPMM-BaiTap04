const mongoose = require('mongoose');

const { Schema } = mongoose;

// Define point transaction types
const POINT_TRANSACTION_TYPES = {
  EARN_PURCHASE: 'earn_purchase',
  EARN_REVIEW: 'earn_review',
  EARN_REFERRAL: 'earn_referral',
  EARN_PROMOTION: 'earn_promotion',
  REDEEM_ORDER: 'redeem_order',
  REDEEM_REWARD: 'redeem_reward',
  EXPIRED: 'expired',
  ADJUSTMENT: 'adjustment',
};

// Define point values
const POINT_VALUES = {
  REVIEW_COMMENT: 50,       // Points for leaving a review
  PURCHASE_PER_1000: 10,    // 10 points per 1000 VND spent
  MIN_POINTS_REDEEM: 1000,  // Minimum points to redeem
};

const LoyaltyHistorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ID người dùng là bắt buộc'],
    },
    type: {
      type: String,
      enum: Object.values(POINT_TRANSACTION_TYPES),
      required: [true, 'Loại giao dịch là bắt buộc'],
    },
    points: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Mô tả không được vượt quá 500 ký tự'],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    referenceType: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isExpired: {
      type: Boolean,
      default: false,
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
LoyaltyHistorySchema.index({ userId: 1, createdAt: -1 });
LoyaltyHistorySchema.index({ userId: 1, type: 1 });
LoyaltyHistorySchema.index({ orderId: 1 });
LoyaltyHistorySchema.index({ expiresAt: 1, isExpired: 1 });

// Pre-save to handle expiration
LoyaltyHistorySchema.pre('save', function (next) {
  if (this.expiresAt && new Date() > this.expiresAt && !this.isExpired) {
    this.isExpired = true;
  }
  next();
});

// Static method to calculate points earned from purchase
LoyaltyHistorySchema.statics.calculatePurchasePoints = function (orderTotal) {
  return Math.floor(orderTotal / 1000) * POINT_VALUES.PURCHASE_PER_1000;
};

// Static method to get point values config
LoyaltyHistorySchema.statics.getPointValues = function () {
  return { ...POINT_VALUES };
};

const LoyaltyHistory = mongoose.model('LoyaltyHistory', LoyaltyHistorySchema);

module.exports = {
  LoyaltyHistory,
  POINT_TRANSACTION_TYPES,
  POINT_VALUES,
};

const mongoose = require('mongoose');

const { Schema } = mongoose;

const CouponSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, 'Mã phiếu giảm giá là bắt buộc'],
      uppercase: true,
      trim: true,
      minlength: [4, 'Mã phiếu giảm giá phải có ít nhất 4 ký tự'],
      maxlength: [50, 'Mã phiếu giảm giá không được vượt quá 50 ký tự'],
    },
    name: {
      type: String,
      required: [true, 'Tên phiếu giảm giá là bắt buộc'],
      trim: true,
      maxlength: [200, 'Tên không được vượt quá 200 ký tự'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Mô tả không được vượt quá 500 ký tự'],
    },
    couponType: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'free_shipping'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Giá trị giảm giá là bắt buộc'],
      min: [0, 'Giá trị giảm giá không được nhỏ hơn 0'],
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: [0, 'Số tiền giảm tối đa không được nhỏ hơn 0'],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Số tiền đơn hàng tối thiểu không được nhỏ hơn 0'],
    },
    maxUsageCount: {
      type: Number,
      default: null,
      min: [1, 'Số lần sử dụng tối đa phải lớn hơn 0'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxUsagePerUser: {
      type: Number,
      default: 1,
      min: 1,
    },
    startDate: {
      type: Date,
      required: [true, 'Ngày bắt đầu là bắt buộc'],
    },
    endDate: {
      type: Date,
      required: [true, 'Ngày kết thúc là bắt buộc'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    assignedUserIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    categoryIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Category',
      default: [],
    },
    productIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Product',
      default: [],
    },
    image: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
CouponSchema.index({ assignedUserIds: 1 });
CouponSchema.index({ createdBy: 1 });

// Virtual for checking if coupon is currently valid
CouponSchema.virtual('isValid').get(function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.startDate &&
    now <= this.endDate &&
    (this.maxUsageCount === null || this.usedCount < this.maxUsageCount)
  );
});

// Check if coupon is expired
CouponSchema.virtual('isExpired').get(function () {
  return new Date() > this.endDate;
});

// Check if coupon has started
CouponSchema.virtual('hasStarted').get(function () {
  return new Date() >= this.startDate;
});

// Virtual for remaining uses
CouponSchema.virtual('remainingUses').get(function () {
  if (this.maxUsageCount === null) return null;
  return Math.max(0, this.maxUsageCount - this.usedCount);
});

// Calculate discount amount
CouponSchema.methods.calculateDiscount = function (orderAmount, productIds = []) {
  if (!this.isValid) return 0;

  if (this.minOrderAmount && orderAmount < this.minOrderAmount) {
    return 0;
  }

  let discount = 0;
  if (this.couponType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100;
    if (this.maxDiscountAmount) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else if (this.couponType === 'fixed_amount') {
    discount = Math.min(this.discountValue, orderAmount);
  } else if (this.couponType === 'free_shipping') {
    discount = 0;
  }

  return Math.round(discount);
};

// Static method to generate unique coupon code
CouponSchema.statics.generateCode = function (prefix = 'SALE') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

CouponSchema.set('toJSON', { virtuals: true });
CouponSchema.set('toObject', { virtuals: true });

const Coupon = mongoose.model('Coupon', CouponSchema);

module.exports = Coupon;

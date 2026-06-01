const mongoose = require('mongoose');

const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'ID sản phẩm là bắt buộc'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ID người dùng là bắt buộc'],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Số sao đánh giá là bắt buộc'],
      min: [1, 'Số sao tối thiểu là 1'],
      max: [5, 'Số sao tối đa là 5'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự'],
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Nội dung đánh giá là bắt buộc'],
      trim: true,
      maxlength: [2000, 'Nội dung không được vượt quá 2000 ký tự'],
    },
    images: {
      type: [String],
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
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
ReviewSchema.index({ productId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ orderId: 1 });
ReviewSchema.index({ rating: -1 });
ReviewSchema.index({ isHidden: 1 });

// Static method to update product rating after review changes
ReviewSchema.statics.updateProductRating = async function (productId) {
  const Product = mongoose.model('Product');
  const stats = await this.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId), isHidden: false } },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].reviewCount,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      rating: 0,
      reviewCount: 0,
    });
  }
};

// Instance method - check if user can edit review (within 7 days)
ReviewSchema.methods.canBeEdited = function () {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const createdTime = new Date(this.createdAt).getTime();
  return Date.now() - createdTime < SEVEN_DAYS;
};

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;

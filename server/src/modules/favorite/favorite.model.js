const mongoose = require('mongoose');

const { Schema } = mongoose;

const FavoriteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ID người dùng là bắt buộc'],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'ID sản phẩm là bắt buộc'],
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

// Each user can only favorite a product once
FavoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });
FavoriteSchema.index({ userId: 1, createdAt: -1 });
FavoriteSchema.index({ productId: 1 });

// Prevent duplicate favorites
FavoriteSchema.statics.toggle = async function (userId, productId) {
  const existing = await this.findOne({ userId, productId });
  if (existing) {
    await existing.deleteOne();
    return { action: 'removed', favorite: null };
  } else {
    const favorite = await this.create({ userId, productId });
    return { action: 'added', favorite };
  }
};

// Count favorites for a product
FavoriteSchema.statics.countForProduct = async function (productId) {
  return this.countDocuments({ productId });
};

const Favorite = mongoose.model('Favorite', FavoriteSchema);

module.exports = Favorite;

const mongoose = require('mongoose');

const { Schema } = mongoose;

const RecentlyViewedSchema = new Schema(
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

// Each user can have each product only once in recently viewed
RecentlyViewedSchema.index({ userId: 1, productId: 1 }, { unique: true });
RecentlyViewedSchema.index({ userId: 1, updatedAt: -1 });

// Static method to add a product to recently viewed
RecentlyViewedSchema.statics.addProduct = async function (userId, productId) {
  const MAX_ITEMS = 50;

  // Use findOneAndUpdate with upsert to update if exists, create if not
  await this.findOneAndUpdate(
    { userId, productId },
    { userId, productId },
    { upsert: true, new: true }
  );

  // Count and remove oldest items if exceeds limit
  const count = await this.countDocuments({ userId });
  if (count > MAX_ITEMS) {
    const oldestItems = await this
      .find({ userId })
      .sort({ updatedAt: 1 })
      .limit(count - MAX_ITEMS)
      .select('_id');

    await this.deleteMany({
      _id: { $in: oldestItems.map((item) => item._id) },
    });
  }
};

// Static method to get recently viewed products for a user
RecentlyViewedSchema.statics.getRecentlyViewed = async function (userId, limit = 10) {
  const items = await this
    .find({ userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate({
      path: 'productId',
      match: { isActive: true },
      select: 'name slug coverImage price salePrice rating reviewCount soldQuantity author category',
      populate: {
        path: 'category',
        select: 'name slug',
      },
    })
    .lean();

  // Filter out any null products (inactive/deleted)
  return items.filter((item) => item.productId !== null).map((item) => item.productId);
};

// Static method to clear all recently viewed
RecentlyViewedSchema.statics.clearAll = async function (userId) {
  await this.deleteMany({ userId });
};

// Static method to remove a specific product
RecentlyViewedSchema.statics.removeProduct = async function (userId, productId) {
  await this.deleteOne({ userId, productId });
};

const RecentlyViewed = mongoose.model('RecentlyViewed', RecentlyViewedSchema);

module.exports = RecentlyViewed;

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    default: '',
  },
  coverImage: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  selected: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

// Schema Giỏ hàng dành cho hệ thống BookStore
const shoppingCartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Mỗi người dùng chỉ có một giỏ hàng duy nhất
    },
    items: [cartItemSchema], // Danh sách sản phẩm trong giỏ hàng
  },
  {
    timestamps: true, // Tự động tạo createdAt và updatedAt
  }
);

// Đánh chỉ mục để tìm kiếm nhanh theo userId
shoppingCartSchema.index({ userId: 1 });

// Lấy danh sách sản phẩm được chọn để đặt hàng
shoppingCartSchema.methods.getSelectedItems = function () {
  return this.items.filter((item) => item.selected);
};

// Tính tổng tiền của các sản phẩm được chọn
shoppingCartSchema.methods.getSelectedTotal = function () {
  return this.getSelectedItems().reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
};

// Tính tổng số lượng tất cả sản phẩm trong giỏ hàng
shoppingCartSchema.methods.getTotalQuantity = function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
};

// Tính tổng số lượng sản phẩm được chọn
shoppingCartSchema.methods.getSelectedQuantity = function () {
  return this.getSelectedItems().reduce(
    (total, item) => total + item.quantity,
    0
  );
};

// Khởi tạo và export model ShoppingCart
const ShoppingCart = mongoose.model('ShoppingCart', shoppingCartSchema);

module.exports = ShoppingCart;


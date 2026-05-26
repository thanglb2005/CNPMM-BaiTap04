const mongoose = require('mongoose');

// Định nghĩa các trạng thái của Đơn hàng (6 trạng thái theo yêu cầu)
const ORDER_STATUS = {
  NEW: 'new',               // 1. Đơn hàng mới
  CONFIRMED: 'confirmed',     // 2. Đã xác nhận đơn hàng
  PREPARING: 'preparing',     // 3. Shop đang chuẩn bị hàng
  SHIPPING: 'shipping',       // 4. Đang giao hàng
  DELIVERED: 'delivered',     // 5. Đã giao thành công
  CANCELLED: 'cancelled',     // 6. Đã hủy đơn hàng
};

// Định nghĩa các trạng thái thanh toán
const PAYMENT_STATUS = {
  PENDING: 'pending', // Đang chờ thanh toán
  PAID: 'paid',       // Đã thanh toán thành công
  FAILED: 'failed',   // Thanh toán thất bại
};

// Schema chi tiết từng sản phẩm trong đơn hàng
const orderItemSchema = new mongoose.Schema(
  {
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
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// Schema lưu vết lịch sử thay đổi trạng thái đơn hàng để làm Timeline
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

// Schema Đơn đặt hàng chính (PurchaseOrder)
const purchaseOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: [orderItemSchema],
    shippingInfo: {
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      note: {
        type: String,
        default: '',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0,
      default: 30000,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'banking', 'wallet'], // Hỗ trợ COD (bắt buộc) và Ví điện tử (wallet)
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.NEW,
    },
    statusHistory: [statusHistorySchema],
    estimatedDelivery: {
      type: Date,
      default: null,
    },
    actualDelivery: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes phục vụ truy vấn tốc độ cao
purchaseOrderSchema.index({ userId: 1, createdAt: -1 });
purchaseOrderSchema.index({ orderNumber: 1 });
purchaseOrderSchema.index({ orderStatus: 1 });

// Middleware pre-save để lưu vết trạng thái khi thay đổi
purchaseOrderSchema.pre('save', async function () {
  if (this.isModified('orderStatus')) {
    // Chỉ add thêm nếu chưa có phần tử cùng trạng thái vừa được thêm ở bước trước đó
    const lastHistory = this.statusHistory[this.statusHistory.length - 1];
    if (!lastHistory || lastHistory.status !== this.orderStatus) {
      this.statusHistory.push({
        status: this.orderStatus,
        changedAt: new Date(),
        note: this.isNew ? 'Khởi tạo đơn hàng mới' : `Cập nhật trạng thái đơn hàng sang ${this.orderStatus}`,
      });
    }
  }
});

// Hàm tạo mã đơn hàng duy nhất dạng ORD-YYYYMMDD-XXXXX
purchaseOrderSchema.statics.generateOrderNumber = async function () {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${dateStr}-`;

  const lastOrder = await this.findOne({
    orderNumber: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (lastOrder) {
    const parts = lastOrder.orderNumber.split('-');
    const lastSequence = parseInt(parts[parts.length - 1], 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(5, '0')}`;
};

// Kiểm tra xem khách hàng có thể tự hủy đơn hàng trực tiếp hay không (< 30 phút và ở trạng thái NEW/CONFIRMED)
purchaseOrderSchema.methods.canBeCancelledByUser = function () {
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const createdTime = new Date(this.createdAt).getTime();
  const now = Date.now();

  // Chỉ cho phép hủy khi ở trạng thái NEW hoặc CONFIRMED và trong vòng 30 phút kể từ lúc đặt hàng
  if (this.orderStatus !== ORDER_STATUS.NEW && this.orderStatus !== ORDER_STATUS.CONFIRMED) {
    return false;
  }

  return now - createdTime < THIRTY_MINUTES;
};

// Kiểm tra xem khách hàng có thể gửi yêu cầu hủy đơn cho shop hay không
// (Khi đơn hàng đang chuẩn bị 'preparing' hoặc đang giao hàng 'shipping')
purchaseOrderSchema.methods.canRequestCancellation = function () {
  return [ORDER_STATUS.PREPARING].includes(this.orderStatus);
};

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

// Export model PurchaseOrder tương thích ngược dưới tên Order
module.exports = { 
  Order: PurchaseOrder, 
  ORDER_STATUS, 
  PAYMENT_STATUS 
};

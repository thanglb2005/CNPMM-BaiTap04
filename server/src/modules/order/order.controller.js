const { Order: PurchaseOrder, ORDER_STATUS, PAYMENT_STATUS } = require('./order.model');
const { CancellationRequest } = require('../cancellation/cancellation.model');
const ShoppingCart = require('../cart/cart.model');
const Product = require('../product/product.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const AppError = require('../../shared/errors/AppError');

const SHIPPING_FEE = 30000;
// Thời gian tự động xác nhận đơn hàng: 30 phút = 30 * 60 * 1000 ms
const AUTO_CONFIRM_DELAY = 30 * 60 * 1000;

// Bộ lưu trữ các timeout hẹn giờ tự động xác nhận đơn hàng đang hoạt động
const autoConfirmJobs = new Map();

// Hẹn giờ tự động xác nhận đơn hàng sau 30 phút kể từ khi đặt thành công
const scheduleAutoConfirm = (purchaseOrder) => {
  const orderIdStr = purchaseOrder._id.toString();
  
  // Nếu đã tồn tại job cũ cho đơn hàng này thì hủy đi trước khi đặt mới
  if (autoConfirmJobs.has(orderIdStr)) {
    clearTimeout(autoConfirmJobs.get(orderIdStr));
  }

  const timeoutId = setTimeout(async () => {
    try {
      const currentOrder = await PurchaseOrder.findById(purchaseOrder._id);
      
      // Chỉ tự động xác nhận nếu đơn hàng vẫn đang ở trạng thái mới (NEW)
      if (currentOrder && currentOrder.orderStatus === ORDER_STATUS.NEW) {
        currentOrder.orderStatus = ORDER_STATUS.CONFIRMED;
        currentOrder.statusHistory.push({
          status: ORDER_STATUS.CONFIRMED,
          changedAt: new Date(),
          note: 'Hệ thống tự động xác nhận sau 30 phút đặt hàng thành công.',
        });
        await currentOrder.save();
        console.log(`⏰ [Auto-Confirm] Đơn hàng ${currentOrder.orderNumber} đã tự động chuyển sang Đã xác nhận.`);
      }
      autoConfirmJobs.delete(orderIdStr);
    } catch (error) {
      console.error(`❌ [Auto-Confirm Error] Đơn hàng ${purchaseOrder.orderNumber}:`, error);
      autoConfirmJobs.delete(orderIdStr);
    }
  }, AUTO_CONFIRM_DELAY);

  autoConfirmJobs.set(orderIdStr, timeoutId);
  console.log(`⏳ [Scheduler] Đã lên lịch tự động xác nhận cho đơn hàng ${purchaseOrder.orderNumber} (30 phút).`);
};

// Hủy bỏ lịch tự động xác nhận nếu đơn hàng bị hủy hoặc cập nhật sớm
const cancelScheduledJob = (orderId) => {
  const orderIdStr = orderId.toString();
  const timeoutId = autoConfirmJobs.get(orderIdStr);
  if (timeoutId) {
    clearTimeout(timeoutId);
    autoConfirmJobs.delete(orderIdStr);
    console.log(`🗑️ [Scheduler] Đã hủy lịch tự động xác nhận cho đơn hàng ID: ${orderIdStr}`);
  }
};

// Tạo đơn hàng mới từ giỏ hàng
const createOrder = async (req, res) => {
  const { shippingInfo, paymentMethod = 'COD' } = req.body;
  const userId = req.user._id;

  if (!shippingInfo || !shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.address) {
    throw new AppError('Thông tin giao nhận hàng không đầy đủ', 400);
  }

  // Validate định dạng số điện thoại Việt Nam
  const phoneRegex = /^(0[2|3|5|7|8|9][0-9]{8,9})$/;
  if (!phoneRegex.test(shippingInfo.phone)) {
    throw new AppError('Số điện thoại không đúng định dạng hợp lệ tại Việt Nam', 400);
  }

  // Tìm giỏ hàng của người dùng
  const shoppingCart = await ShoppingCart.findOne({ userId });
  if (!shoppingCart || shoppingCart.items.length === 0) {
    throw new AppError('Giỏ hàng của bạn đang trống, không thể đặt hàng', 400);
  }

  // Lọc ra các sản phẩm được chọn để mua hàng
  const selectedItems = shoppingCart.items.filter((item) => item.selected);
  if (selectedItems.length === 0) {
    throw new AppError('Vui lòng chọn ít nhất một mặt hàng trong giỏ hàng để tiến hành thanh toán', 400);
  }

  const stockErrors = [];
  const validItems = [];

  // Kiểm tra tồn kho cho từng sản phẩm được chọn
  for (const item of selectedItems) {
    const product = await Product.findById(item.productId).lean();
    if (!product) {
      stockErrors.push(`${item.name}: Sản phẩm không tồn tại trên hệ thống`);
      continue;
    }
    if (!product.isActive) {
      stockErrors.push(`${item.name}: Sản phẩm hiện đã ngừng kinh doanh`);
      continue;
    }
    if (product.stockQuantity < item.quantity) {
      stockErrors.push(
        `${item.name}: Kho hiện chỉ còn ${product.stockQuantity} cuốn (bạn chọn ${item.quantity})`
      );
      continue;
    }

    validItems.push({
      productId: product._id,
      name: item.name,
      author: item.author,
      coverImage: item.coverImage,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
    });
  }

  // Nếu không có sản phẩm nào hợp lệ để đặt (lỗi tồn kho hết)
  if (validItems.length === 0) {
    throw new AppError(
      `Không thể đặt hàng do lỗi tồn kho: ${stockErrors.join('; ')}`,
      400
    );
  }

  const subtotal = validItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = SHIPPING_FEE;
  const totalAmount = subtotal + shippingFee;

  // Tạo số hóa đơn duy nhất
  const orderNumber = await PurchaseOrder.generateOrderNumber();

  // Thiết lập trạng thái thanh toán mặc định dựa trên phương thức thanh toán
  // Đối với ví điện tử giả lập, ban đầu cũng có thể để PENDING và thanh toán thành công sau đó ở UI
  const initialPaymentStatus = paymentMethod === 'wallet' ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING;

  const purchaseOrder = new PurchaseOrder({
    userId,
    orderNumber,
    items: validItems,
    shippingInfo,
    subtotal,
    shippingFee,
    totalAmount,
    paymentMethod,
    paymentStatus: initialPaymentStatus,
    orderStatus: ORDER_STATUS.NEW,
    statusHistory: [
      {
        status: ORDER_STATUS.NEW,
        changedAt: new Date(),
        note: 'Đơn hàng mới đã được khởi tạo thành công.',
      },
    ],
  });

  await purchaseOrder.save();

  // Trừ số lượng tồn kho và tăng số lượng bán ra
  for (const item of validItems) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stockQuantity: -item.quantity, soldQuantity: item.quantity },
    });
  }

  // Dọn sạch các sản phẩm vừa mua khỏi giỏ hàng
  const remainingItems = shoppingCart.items.filter(
    (item) => !validItems.some((v) => v.productId.toString() === item.productId.toString())
  );
  shoppingCart.items = remainingItems;
  await shoppingCart.save();

  // Lên lịch tự động xác nhận sau 30 phút
  scheduleAutoConfirm(purchaseOrder);

  res.status(201).json(
    ApiResponse.success(
      {
        order: purchaseOrder,
        stockErrors: stockErrors.length > 0 ? stockErrors : undefined,
        message: stockErrors.length > 0
          ? 'Đặt hàng thành công, tuy nhiên một số sản phẩm đã bị loại bỏ do không đủ hàng tồn kho.'
          : 'Đặt hàng thành công! Đơn hàng của bạn đang được xử lý.',
      },
      'Tạo đơn hàng thành công'
    )
  );
};

// Lấy danh sách lịch sử đơn hàng của người dùng hiện tại
const getOrders = async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10, status } = req.query;

  const query = { userId };
  if (status) {
    query.orderStatus = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    PurchaseOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    PurchaseOrder.countDocuments(query),
  ]);

  res.status(200).json(
    ApiResponse.success(
      {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      'Lấy danh sách đơn hàng thành công'
    )
  );
};

// Lấy chi tiết đơn hàng theo ID
const getOrderById = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId, userId }).lean();

  if (!purchaseOrder) {
    throw new AppError('Không tìm thấy đơn hàng tương ứng', 404);
  }

  // Tìm yêu cầu hủy đơn liên quan (nếu có)
  const cancellationRequest = await CancellationRequest.findOne({
    orderId,
  }).lean();

  res.status(200).json(
    ApiResponse.success(
      {
        order: purchaseOrder,
        cancellationRequest,
      },
      'Lấy chi tiết đơn hàng thành công'
    )
  );
};

// Khách hàng hủy đơn trực tiếp (chỉ khi < 30 phút và ở trạng thái NEW/CONFIRMED)
const cancelOrder = async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId, userId });

  if (!purchaseOrder) {
    throw new AppError('Không tìm thấy đơn đặt hàng', 404);
  }

  if (!purchaseOrder.canBeCancelledByUser()) {
    throw new AppError(
      'Không thể tự hủy đơn hàng lúc này. Bạn chỉ được phép hủy trực tiếp trong vòng 30 phút kể từ lúc đặt hàng và khi đơn hàng ở trạng thái Mới hoặc Đã xác nhận.',
      400
    );
  }

  // Hủy tác vụ tự động xác nhận nếu có
  cancelScheduledJob(orderId);

  // Hoàn lại kho số lượng sản phẩm
  for (const item of purchaseOrder.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stockQuantity: item.quantity, soldQuantity: -item.quantity },
    });
  }

  purchaseOrder.orderStatus = ORDER_STATUS.CANCELLED;
  purchaseOrder.cancelledAt = new Date();
  purchaseOrder.cancellationReason = reason || 'Khách hàng chủ động hủy đơn hàng trực tiếp';
  purchaseOrder.statusHistory.push({
    status: ORDER_STATUS.CANCELLED,
    changedAt: new Date(),
    note: reason || 'Khách hàng hủy đơn trực tiếp.',
  });

  await purchaseOrder.save();

  res.status(200).json(
    ApiResponse.success({ order: purchaseOrder }, 'Hủy đơn hàng thành công')
  );
};

// Khách hàng gửi yêu cầu hủy đơn cho Shop (khi đã ở trạng thái PREPARING - chuẩn bị hàng)
const requestCancellation = async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  if (!reason || reason.trim().length === 0) {
    throw new AppError('Vui lòng nhập lý do hủy đơn hàng của bạn', 400);
  }

  const purchaseOrder = await PurchaseOrder.findOne({ _id: orderId, userId });

  if (!purchaseOrder) {
    throw new AppError('Không tìm thấy đơn đặt hàng tương ứng', 404);
  }

  if (!purchaseOrder.canRequestCancellation()) {
    throw new AppError(
      'Đơn hàng đang ở trạng thái không cho phép gửi yêu cầu hủy đơn (chỉ cho phép khi shop đang chuẩn bị hàng).',
      400
    );
  }

  // Kiểm tra xem đã gửi yêu cầu trước đó chưa
  const existingRequest = await CancellationRequest.findOne({ orderId });
  if (existingRequest) {
    throw new AppError('Bạn đã gửi yêu cầu hủy cho đơn hàng này rồi, vui lòng chờ shop phản hồi', 400);
  }

  const cancellationRequest = new CancellationRequest({
    orderId,
    userId,
    reason,
    status: 'pending',
  });

  await cancellationRequest.save();

  res.status(201).json(
    ApiResponse.success(
      { cancellationRequest },
      'Gửi yêu cầu hủy đơn hàng lên Shop thành công. Vui lòng chờ phê duyệt!'
    )
  );
};

// [ADMIN] Cập nhật trạng thái đơn hàng thủ công
const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status, note } = req.body;

  const purchaseOrder = await PurchaseOrder.findById(orderId);

  if (!purchaseOrder) {
    throw new AppError('Không tìm thấy đơn đặt hàng', 404);
  }

  // Định nghĩa vòng đời chuyển đổi trạng thái hợp lệ
  const validTransitions = {
    [ORDER_STATUS.NEW]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [],
  };

  if (!validTransitions[purchaseOrder.orderStatus]?.includes(status)) {
    throw new AppError(
      `Quy trình nghiệp vụ không cho phép chuyển từ trạng thái "${purchaseOrder.orderStatus}" sang "${status}"`,
      400
    );
  }

  // Nếu chuyển sang CANCELLED ngoài trạng thái NEW (cần được duyệt yêu cầu hủy đơn trước)
  if (
    status === ORDER_STATUS.CANCELLED &&
    purchaseOrder.orderStatus !== ORDER_STATUS.NEW &&
    purchaseOrder.orderStatus !== ORDER_STATUS.CONFIRMED
  ) {
    const cancellationRequest = await CancellationRequest.findOne({
      orderId,
      status: 'approved',
    });

    if (!cancellationRequest) {
      throw new AppError(
        'Không thể trực tiếp hủy đơn hàng. Bạn cần phải phê duyệt Yêu cầu hủy đơn của khách hàng trước.',
        400
      );
    }
  }

  // Xử lý khi hủy đơn hàng: hoàn trả số lượng tồn kho sản phẩm
  if (status === ORDER_STATUS.CANCELLED) {
    for (const item of purchaseOrder.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQuantity: item.quantity, soldQuantity: -item.quantity },
      });
    }
    purchaseOrder.cancelledAt = new Date();
    purchaseOrder.cancellationReason = note || 'Shop chủ động hủy đơn hàng hoặc phê duyệt yêu cầu hủy';
  }

  // Xử lý khi đã giao hàng thành công
  if (status === ORDER_STATUS.DELIVERED) {
    purchaseOrder.actualDelivery = new Date();
    purchaseOrder.paymentStatus = PAYMENT_STATUS.PAID; // COD giao thành công coi như đã trả tiền
  }

  // Hủy tác vụ tự động xác nhận đơn hàng khi admin cập nhật sớm
  cancelScheduledJob(orderId);

  purchaseOrder.orderStatus = status;
  purchaseOrder.statusHistory.push({
    status,
    changedAt: new Date(),
    note: note || `Được cập nhật bởi Admin hệ thống.`,
  });

  await purchaseOrder.save();

  res.status(200).json(
    ApiResponse.success({ order: purchaseOrder }, 'Cập nhật trạng thái đơn hàng thành công')
  );
};

// [ADMIN] Lấy danh sách toàn bộ đơn hàng trong hệ thống
const getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status, userId } = req.query;

  const query = {};
  if (status) {
    query.orderStatus = status;
  }
  if (userId) {
    query.userId = userId;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    PurchaseOrder.find(query)
      .populate('userId', 'email username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    PurchaseOrder.countDocuments(query),
  ]);

  res.status(200).json(
    ApiResponse.success(
      {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      'Lấy danh sách tất cả đơn hàng thành công (Admin)'
    )
  );
};

// [ADMIN] Lấy danh sách các yêu cầu hủy đơn hàng từ khách hàng
const getCancellationRequests = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const query = {};
  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [requests, total] = await Promise.all([
    CancellationRequest.find(query)
      .populate('orderId')
      .populate('userId', 'email username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    CancellationRequest.countDocuments(query),
  ]);

  res.status(200).json(
    ApiResponse.success(
      {
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      'Lấy danh sách yêu cầu hủy đơn thành công (Admin)'
    )
  );
};

// [ADMIN] Phê duyệt hoặc Từ chối yêu cầu hủy đơn của khách hàng
const processCancellationRequest = async (req, res) => {
  const { requestId } = req.params;
  const { approved, shopResponse } = req.body;

  const cancellationRequest = await CancellationRequest.findById(requestId);

  if (!cancellationRequest) {
    throw new AppError('Không tìm thấy yêu cầu hủy đơn nào khớp', 404);
  }

  if (cancellationRequest.status !== 'pending') {
    throw new AppError('Yêu cầu hủy đơn này đã được xử lý từ trước', 400);
  }

  cancellationRequest.status = approved ? 'approved' : 'rejected';
  cancellationRequest.shopResponse = shopResponse || '';
  cancellationRequest.processedAt = new Date();
  await cancellationRequest.save();

  // Nếu được phê duyệt hủy đơn
  if (approved) {
    const purchaseOrder = await PurchaseOrder.findById(cancellationRequest.orderId);
    if (purchaseOrder && purchaseOrder.orderStatus !== ORDER_STATUS.CANCELLED) {
      // Hoàn trả tồn kho
      for (const item of purchaseOrder.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stockQuantity: item.quantity, soldQuantity: -item.quantity },
        });
      }
      purchaseOrder.orderStatus = ORDER_STATUS.CANCELLED;
      purchaseOrder.cancelledAt = new Date();
      purchaseOrder.cancellationReason = `Shop chấp thuận yêu cầu hủy đơn: ${shopResponse || 'Đồng ý hủy'}`;
      purchaseOrder.statusHistory.push({
        status: ORDER_STATUS.CANCELLED,
        changedAt: new Date(),
        note: `Shop chấp thuận yêu cầu hủy đơn: ${shopResponse || 'Đồng ý hủy'}.`,
      });
      await purchaseOrder.save();
    }
  }

  res.status(200).json(
    ApiResponse.success(
      { cancellationRequest },
      approved ? 'Đã chấp thuận duyệt hủy đơn hàng thành công' : 'Đã từ chối duyệt hủy đơn hàng'
    )
  );
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  requestCancellation,
  updateOrderStatus,
  getAllOrders,
  getCancellationRequests,
  processCancellationRequest,
};

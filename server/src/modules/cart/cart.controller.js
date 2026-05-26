const ShoppingCart = require('./cart.model');
const Product = require('../product/product.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const AppError = require('../../shared/errors/AppError');

// Lấy thông tin giỏ hàng của người dùng hiện tại
const getShoppingCart = async (req, res) => {
  const userId = req.user._id;
  let shoppingCart = await ShoppingCart.findOne({ userId });

  // Nếu người dùng chưa có giỏ hàng, khởi tạo một giỏ hàng trống mới
  if (!shoppingCart) {
    shoppingCart = new ShoppingCart({ userId, items: [] });
    await shoppingCart.save();
  }

  // Lọc ra các mặt hàng đang được đánh dấu chọn để mua
  const selectedCartItems = shoppingCart.items.filter((item) => item.selected);
  
  // Tính tổng tiền các mặt hàng được chọn
  const subtotal = selectedCartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  // Phí giao hàng: mặc định 30,000 VND nếu giỏ hàng có hàng chọn, ngược lại là 0 VND
  const shippingFee = subtotal > 0 ? 30000 : 0;
  const total = subtotal + shippingFee;

  res.status(200).json(
    ApiResponse.success(
      {
        cart: shoppingCart.toObject(),
        summary: {
          totalItems: shoppingCart.getTotalQuantity(),
          selectedItems: selectedCartItems.length,
          selectedQuantity: shoppingCart.getSelectedQuantity(),
          subtotal,
          shippingFee,
          total,
        },
      },
      'Lấy thông tin giỏ hàng thành công'
    )
  );
};

// Thêm sản phẩm vào giỏ hàng
const addToShoppingCart = async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const userId = req.user._id;

  if (!productId) {
    throw new AppError('Mã sản phẩm là bắt buộc', 400);
  }

  if (quantity < 1) {
    throw new AppError('Số lượng sản phẩm thêm vào phải lớn hơn 0', 400);
  }

  // Kiểm tra tính hợp lệ của sản phẩm trong hệ thống
  const product = await Product.findById(productId).lean();
  if (!product) {
    throw new AppError('Không tìm thấy sản phẩm yêu cầu', 404);
  }

  if (!product.isActive) {
    throw new AppError('Sản phẩm này hiện tại đã ngừng kinh doanh', 400);
  }

  if (product.stockQuantity < quantity) {
    throw new AppError(
      `Kho chỉ còn ${product.stockQuantity} sản phẩm, không đủ đáp ứng số lượng bạn chọn`,
      400
    );
  }

  let shoppingCart = await ShoppingCart.findOne({ userId });

  if (!shoppingCart) {
    // Nếu chưa có giỏ hàng, khởi tạo mới cùng sản phẩm đầu tiên
    shoppingCart = new ShoppingCart({
      userId,
      items: [
        {
          productId: product._id,
          name: product.name,
          author: product.author || '',
          coverImage: product.coverImage || '',
          price: product.salePrice || product.price,
          quantity,
          selected: true,
        },
      ],
    });
    await shoppingCart.save();
  } else {
    // Tìm kiếm xem sản phẩm đã có sẵn trong giỏ hàng hay chưa
    const existingIndex = shoppingCart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (existingIndex !== -1) {
      const updatedQuantity = shoppingCart.items[existingIndex].quantity + quantity;

      if (updatedQuantity > product.stockQuantity) {
        throw new AppError(
          `Tổng số lượng trong giỏ hàng (${updatedQuantity}) vượt quá số lượng tồn kho (${product.stockQuantity})`,
          400
        );
      }

      shoppingCart.items[existingIndex].quantity = updatedQuantity;
    } else {
      // Nếu sản phẩm chưa có trong giỏ hàng, chèn phần tử mới vào danh sách
      shoppingCart.items.push({
        productId: product._id,
        name: product.name,
        author: product.author || '',
        coverImage: product.coverImage || '',
        price: product.salePrice || product.price,
        quantity,
        selected: true,
      });
    }

    await shoppingCart.save();
  }

  res.status(200).json(
    ApiResponse.success(
      {
        cart: shoppingCart,
      },
      'Thêm sách vào giỏ hàng thành công'
    )
  );
};

// Cập nhật số lượng của một mặt hàng trong giỏ hàng
const updateShoppingCartItem = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  const userId = req.user._id;

  if (!quantity || quantity < 1) {
    throw new AppError('Số lượng cập nhật phải lớn hơn hoặc bằng 1', 400);
  }

  const shoppingCart = await ShoppingCart.findOne({ userId });
  if (!shoppingCart) {
    throw new AppError('Không tìm thấy giỏ hàng của bạn', 404);
  }

  const index = shoppingCart.items.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (index === -1) {
    throw new AppError('Sản phẩm này không nằm trong giỏ hàng', 404);
  }

  const product = await Product.findById(productId).lean();
  if (!product) {
    throw new AppError('Không tìm thấy sản phẩm tương ứng trong hệ thống', 404);
  }

  if (quantity > product.stockQuantity) {
    throw new AppError(
      `Kho chỉ còn ${product.stockQuantity} sản phẩm, không thể đặt số lượng ${quantity}`,
      400
    );
  }

  shoppingCart.items[index].quantity = quantity;
  await shoppingCart.save();

  res.status(200).json(
    ApiResponse.success(
      { cart: shoppingCart },
      'Cập nhật số lượng sản phẩm thành công'
    )
  );
};

// Xóa một mặt hàng khỏi giỏ hàng
const removeFromShoppingCart = async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;

  const shoppingCart = await ShoppingCart.findOne({ userId });
  if (!shoppingCart) {
    throw new AppError('Giỏ hàng của bạn đang trống', 404);
  }

  const index = shoppingCart.items.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (index === -1) {
    throw new AppError('Sản phẩm cần xóa không có trong giỏ hàng', 404);
  }

  shoppingCart.items.splice(index, 1);
  await shoppingCart.save();

  res.status(200).json(
    ApiResponse.success(
      { cart: shoppingCart },
      'Xóa sản phẩm khỏi giỏ hàng thành công'
    )
  );
};

// Xóa sạch toàn bộ giỏ hàng
const clearShoppingCart = async (req, res) => {
  const userId = req.user._id;

  const shoppingCart = await ShoppingCart.findOne({ userId });
  if (shoppingCart) {
    shoppingCart.items = [];
    await shoppingCart.save();
  }

  res.status(200).json(
    ApiResponse.success(
      { cart: { userId, items: [] } },
      'Xóa toàn bộ giỏ hàng thành công'
    )
  );
};

// Chọn hoặc bỏ chọn một sản phẩm trong giỏ hàng để chuẩn bị thanh toán
const toggleSelectShoppingCartItem = async (req, res) => {
  const { productId } = req.params;
  const { selected } = req.body;
  const userId = req.user._id;

  const shoppingCart = await ShoppingCart.findOne({ userId });
  if (!shoppingCart) {
    throw new AppError('Giỏ hàng của bạn đang trống', 404);
  }

  const index = shoppingCart.items.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (index === -1) {
    throw new AppError('Sản phẩm cần chọn không tồn tại trong giỏ hàng', 404);
  }

  shoppingCart.items[index].selected = selected !== false;
  await shoppingCart.save();

  res.status(200).json(
    ApiResponse.success(
      { cart: shoppingCart },
      selected !== false ? 'Đã chọn sản phẩm thanh toán' : 'Đã bỏ chọn sản phẩm thanh toán'
    )
  );
};

// Chọn hoặc bỏ chọn tất cả sản phẩm trong giỏ hàng
const selectAllShoppingCartItems = async (req, res) => {
  const { selected } = req.body;
  const userId = req.user._id;

  const shoppingCart = await ShoppingCart.findOne({ userId });
  if (!shoppingCart) {
    throw new AppError('Giỏ hàng của bạn đang trống', 404);
  }

  shoppingCart.items.forEach((item) => {
    item.selected = selected !== false;
  });
  await shoppingCart.save();

  res.status(200).json(
    ApiResponse.success(
      { cart: shoppingCart },
      selected !== false ? 'Đã chọn tất cả sản phẩm' : 'Đã bỏ chọn tất cả sản phẩm'
    )
  );
};

module.exports = {
  getCart: getShoppingCart,
  addToCart: addToShoppingCart,
  updateCartItem: updateShoppingCartItem,
  removeFromCart: removeFromShoppingCart,
  clearCart: clearShoppingCart,
  toggleSelectItem: toggleSelectShoppingCartItem,
  selectAllItems: selectAllShoppingCartItems,
};

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaTruck, FaMoneyBillWave, FaWallet, FaCheckCircle, FaQrcode } from 'react-icons/fa';
import { fetchCart } from '../../store/slices/cartSlice';
import { createOrder, clearCurrentOrder } from '../../store/slices/orderSlice';
import Layout from '../../components/Layout/Layout';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart, summary, loading: cartLoading } = useSelector((state) => state.cart);
  const { currentOrder, loading: orderLoading, error } = useSelector((state) => state.order);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    note: '',
  });

  const [errors, setErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrTimer, setQrTimer] = useState(300); // 5 phút đếm ngược
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  useEffect(() => {
    dispatch(fetchCart());
    dispatch(clearCurrentOrder());
  }, [dispatch]);

  // Đếm ngược thời gian chuyển khoản/quét QR
  useEffect(() => {
    let timer;
    if (showQRModal && qrTimer > 0) {
      timer = setInterval(() => {
        setQrTimer((prev) => prev - 1);
      }, 1000);
    } else if (qrTimer === 0) {
      setShowQRModal(false);
      toast.error('Giao dịch quét mã QR đã hết hạn!');
    }
    return () => clearInterval(timer);
  }, [showQRModal, qrTimer]);

  useEffect(() => {
    if (orderSubmitted && currentOrder) {
      toast.success('Đặt hàng thành công!');
      navigate(`/orders/${currentOrder._id}`);
    }
  }, [currentOrder, orderSubmitted, navigate]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên người nhận';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0[2|3|5|7|8|9][0-9]{8,9})$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ (định dạng 10 số)';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Vui lòng nhập địa chỉ nhận hàng chi tiết';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Kích hoạt tiến trình đặt hàng
  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      toast.error('Vui lòng điền đầy đủ và chính xác thông tin giao hàng!');
      return;
    }

    if (summary.selectedQuantity === 0) {
      toast.error('Giỏ hàng chưa chọn sản phẩm nào để mua!');
      return;
    }

    // Nếu chọn Ví điện tử, kích hoạt hiển thị QR thanh toán trước
    if (paymentMethod === 'wallet') {
      setQrTimer(300);
      setShowQRModal(true);
    } else {
      // Nếu là COD, tiến hành gọi API tạo đơn ngay
      await executeOrderCreation('COD');
    }
  };

  // Gọi API tạo đơn thực tế
  const executeOrderCreation = async (method) => {
    try {
      setOrderSubmitted(true);
      await dispatch(
        createOrder({
          shippingInfo: {
            fullName: formData.fullName,
            phone: formData.phone,
            address: formData.address,
            note: formData.note,
          },
          paymentMethod: method,
        })
      ).unwrap();
    } catch (err) {
      setOrderSubmitted(false);
      toast.error(err || 'Đặt hàng không thành công, vui lòng thử lại');
    }
  };

  // Xác nhận quét mã thành công (Giả lập)
  const handleMockPaymentSuccess = async () => {
    setShowQRModal(false);
    toast.success('Thanh toán ví điện tử thành công! Đang tạo đơn hàng...');
    await executeOrderCreation('wallet');
  };

  const selectedItems = cart?.items?.filter((item) => item.selected) || [];

  if (cartLoading && !cart) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (summary.selectedQuantity === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Giỏ hàng của bạn đang trống!
            </h2>
            <p className="text-gray-500 mb-6">Hãy quay lại giỏ hàng và chọn sản phẩm trước khi thanh toán.</p>
            <Link
              to="/cart"
              className="inline-block w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all transform hover:-translate-y-0.5"
            >
              Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/cart"
            className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 text-gray-500 hover:text-indigo-600 transition-all"
          >
            <FaArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Thanh toán đơn hàng</h1>
            <p className="text-sm text-gray-500">Hoàn tất thông tin đặt sách của bạn</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cột trái: Thông tin nhận hàng & Thanh toán */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FaTruck size={18} />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Thông tin giao nhận hàng</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Họ và tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Nhập họ và tên người nhận"
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${
                      errors.fullName ? 'border-red-500 bg-red-50/10' : 'border-gray-200'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Số điện thoại di động"
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${
                      errors.phone ? 'border-red-500 bg-red-50/10' : 'border-gray-200'
                    }`}
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Địa chỉ nhận hàng chi tiết <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none ${
                      errors.address ? 'border-red-500 bg-red-50/10' : 'border-gray-200'
                    }`}
                  />
                  {errors.address && (
                    <p className="text-xs text-red-500 mt-1">{errors.address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Ghi chú vận chuyển (nếu có)
                  </label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Ghi chú thêm cho bưu tá (ví dụ: giao giờ hành chính, gọi trước 15 phút)"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Chọn Phương thức Thanh toán */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FaMoneyBillWave size={18} />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Phương thức thanh toán</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lựa chọn COD */}
                <div
                  onClick={() => setPaymentMethod('COD')}
                  className={`cursor-pointer border rounded-2xl p-4 flex gap-4 transition-all items-start ${
                    paymentMethod === 'COD'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="w-4 h-4 text-indigo-600"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FaMoneyBillWave className="text-indigo-600" />
                      <p className="font-bold text-gray-800 text-sm">Thanh toán khi nhận hàng (COD)</p>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Bạn sẽ trả tiền mặt trực tiếp cho nhân viên giao hàng khi nhận được sách.
                    </p>
                  </div>
                </div>

                {/* Lựa chọn Ví điện tử */}
                <div
                  onClick={() => setPaymentMethod('wallet')}
                  className={`cursor-pointer border rounded-2xl p-4 flex gap-4 transition-all items-start ${
                    paymentMethod === 'wallet'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={() => setPaymentMethod('wallet')}
                      className="w-4 h-4 text-indigo-600"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FaWallet className="text-indigo-600" />
                      <p className="font-bold text-gray-800 text-sm">Ví điện tử Momo/VNPAY [Mock]</p>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Quét mã QR qua ví điện tử để thanh toán trực tuyến nhanh gọn, an toàn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Tóm tắt đơn hàng */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Đơn hàng của bạn</h2>

              <div className="space-y-4 max-h-64 overflow-y-auto pb-4 border-b border-gray-100 pr-1">
                {selectedItems.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <img
                      src={item.coverImage || 'https://via.placeholder.com/120x160'}
                      alt={item.name}
                      className="w-10 h-14 object-cover rounded-lg border border-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Số lượng: x{item.quantity}</p>
                      <p className="text-xs font-bold text-indigo-600 mt-1">
                        {(item.price * item.quantity).toLocaleString()} đ
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 py-4 border-b border-gray-100">
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Tiền hàng</span>
                  <span className="font-medium text-gray-800">{summary.subtotal.toLocaleString()} đ</span>
                </div>
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Phí giao hàng</span>
                  <span className="font-medium text-gray-800">{summary.shippingFee.toLocaleString()} đ</span>
                </div>
              </div>

              <div className="py-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-800">Tổng cộng</span>
                  <span className="text-xl font-extrabold text-indigo-600">
                    {summary.total.toLocaleString()} đ
                  </span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={orderLoading}
                className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex justify-center items-center gap-2"
              >
                {orderLoading ? 'Đang khởi tạo đơn hàng...' : paymentMethod === 'wallet' ? 'Thanh toán & Đặt hàng' : 'Xác nhận Đặt hàng'}
              </button>

              <p className="text-xxs text-gray-400 text-center mt-4 leading-relaxed">
                Nhấn đặt hàng đồng nghĩa bạn chấp thuận các{' '}
                <span className="text-indigo-500 underline cursor-pointer">Chính sách mua bán</span> và{' '}
                <span className="text-indigo-500 underline cursor-pointer">Bảo mật thông tin</span> của BookStore.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MÃ QR THANH TOÁN GIẢ LẬP (MOMO/VNPAY) */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 transform scale-100 transition-all animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-indigo-600 p-6 text-white text-center">
              <FaQrcode className="mx-auto text-4xl mb-2 animate-bounce" />
              <h3 className="text-xl font-extrabold">Cổng Thanh Toán Điện Tử</h3>
              <p className="text-xs text-indigo-100/90 mt-1">Giả lập thanh toán trực tuyến nhanh chóng</p>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Tổng tiền cần thanh toán</p>
              <p className="text-2xl font-black text-indigo-600 mb-6">{summary.total.toLocaleString()} đ</p>

              {/* QR Block */}
              <div className="relative mx-auto w-52 h-52 bg-white border-2 border-gray-100 rounded-2xl p-3 shadow-md flex items-center justify-center overflow-hidden mb-4">
                {/* Vector QR Placeholder */}
                <div className="w-full h-full bg-slate-50 rounded-xl flex flex-col items-center justify-center p-3 text-indigo-500 relative">
                  <div className="grid grid-cols-6 gap-1 w-full h-full opacity-80">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm ${(i % 3 === 0 || i % 7 === 0 || i < 6 || i > 30 || i % 6 === 0) ? 'bg-indigo-900' : 'bg-transparent'}`}
                      />
                    ))}
                  </div>
                  {/* Logo Center */}
                  <div className="absolute bg-white p-2 rounded-xl shadow-md border border-gray-100">
                    <FaWallet className="text-2xl text-indigo-600" />
                  </div>
                </div>
              </div>

              {/* Đếm ngược */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold mb-6">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                Thời gian quét mã còn lại: {formatTimer(qrTimer)}
              </div>

              <div className="text-left bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span className="font-semibold">Nội dung chuyển khoản:</span>
                  <span className="font-mono text-gray-800 font-bold">THANH TOAN DON HANG BOOKSTORE</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Tài khoản thụ hưởng:</span>
                  <span className="text-gray-800">CÔNG TY BOOKSTORE VN</span>
                </div>
                <div className="text-center text-xxs text-gray-400 border-t pt-2 mt-2">
                  Vui lòng quét mã QR hoặc nhấn nút Giả lập quét thành công để thanh toán.
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleMockPaymentSuccess}
                  className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-50"
                >
                  <FaCheckCircle size={16} />
                  Giả lập Quét mã Thành công
                </button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="w-full py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-all text-sm"
                >
                  Hủy bỏ giao dịch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

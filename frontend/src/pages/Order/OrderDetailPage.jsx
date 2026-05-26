import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaBox, FaMapMarkerAlt, FaPhone, FaUser, FaTimes, FaExclamationTriangle, FaCheckCircle, FaMoneyBillWave, FaWallet } from 'react-icons/fa';
import { fetchOrderById, cancelOrder, requestOrderCancellation } from '../../store/slices/orderSlice';
import Layout from '../../components/Layout/Layout';
import OrderStatusTracker from '../../components/OrderStatusTracker/OrderStatusTracker';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const dispatch = useDispatch();
  const { currentOrder, loading, error, cancellationRequest } = useSelector((state) => state.order);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRequestCancelModal, setShowRequestCancelModal] = useState(false);
  const [requestCancelReason, setRequestCancelReason] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    dispatch(fetchOrderById(orderId));
  }, [dispatch, orderId]);

  // Bộ đếm ngược 30 phút để hủy đơn hàng trực tiếp
  useEffect(() => {
    if (!currentOrder || (currentOrder.orderStatus !== 'new' && currentOrder.orderStatus !== 'confirmed')) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const createdTime = new Date(currentOrder.createdAt).getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      const expiresAt = createdTime + thirtyMinutes;
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setTimeRemaining(null);
      } else {
        const minutes = Math.floor(remaining / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeRemaining({ minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentOrder]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 1. Cho phép HỦY TRỰC TIẾP nếu đơn hàng còn mới (new) hoặc đã xác nhận (confirmed) VÀ trong vòng 30 phút
  const canCancel = () => {
    if (!currentOrder) return false;
    return (currentOrder.orderStatus === 'new' || currentOrder.orderStatus === 'confirmed') && timeRemaining !== null;
  };

  // 2. Chuyển sang GỬI YÊU CẦU HỦY ĐƠN LÊN SHOP nếu đơn hàng đang ở bước 3: preparing (Shop đang chuẩn bị hàng)
  // và chưa gửi yêu cầu hủy đơn nào
  const canRequestCancel = () => {
    if (!currentOrder) return false;
    return currentOrder.orderStatus === 'preparing' && !cancellationRequest;
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy đơn hàng');
      return;
    }

    try {
      await dispatch(cancelOrder({ orderId, reason: cancelReason })).unwrap();
      toast.success('Hủy đơn hàng thành công!');
      setShowCancelModal(false);
      dispatch(fetchOrderById(orderId));
    } catch (err) {
      toast.error(err || 'Không thể hủy đơn hàng');
    }
  };

  const handleRequestCancel = async () => {
    if (!requestCancelReason.trim()) {
      toast.error('Vui lòng điền lý do yêu cầu hủy đơn hàng');
      return;
    }

    try {
      await dispatch(requestOrderCancellation({ orderId, reason: requestCancelReason })).unwrap();
      toast.success('Gửi yêu cầu hủy đơn lên shop thành công! Vui lòng chờ phản hồi.');
      dispatch(fetchOrderById(orderId));
      setShowRequestCancelModal(false);
    } catch (err) {
      toast.error(err || 'Gửi yêu cầu hủy đơn thất bại');
    }
  };

  if (loading && !currentOrder) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!currentOrder) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100">
            <h1 className="text-xl font-bold text-gray-800 mb-4">Không tìm thấy đơn hàng!</h1>
            <Link
              to="/orders"
              className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              Quay lại danh sách đơn hàng
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Tiêu chuẩn hóa trạng thái của yêu cầu hủy đơn
  const getCancellationRequestBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold border border-amber-200">Đang chờ shop duyệt hủy</span>;
      case 'approved':
        return <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold border border-rose-200">Đơn đã được shop duyệt hủy</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-bold border border-slate-200">Shop từ chối hủy đơn</span>;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/orders"
            className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 text-gray-500 hover:text-indigo-600 transition-all"
          >
            <FaArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chi tiết đơn hàng</h1>
            <p className="text-sm text-gray-500">Mã đơn: <span className="font-mono font-bold text-gray-700">{currentOrder.orderNumber}</span></p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cột trái: Tiến trình & Sản phẩm */}
          <div className="lg:col-span-2 space-y-6">
            {/* Thẻ mã đơn hàng & Thời gian hủy */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400">Thời gian tạo đơn</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">{formatDate(currentOrder.createdAt)}</p>
              </div>

              {/* Thông báo thời gian hủy trực tiếp còn lại */}
              {canCancel() && timeRemaining && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-amber-700 text-xs">
                  <FaExclamationTriangle size={16} className="text-amber-500 animate-pulse" />
                  <div>
                    <p className="font-bold">Đơn hàng có thể tự hủy trực tiếp</p>
                    <p className="text-xxs text-amber-600">Mã tự động xác nhận hoặc hết hạn hủy sau: <strong className="text-red-500 font-mono text-sm">{timeRemaining.minutes}:{timeRemaining.seconds.toString().padStart(2, '0')}</strong></p>
                  </div>
                </div>
              )}

              {/* Trạng thái yêu cầu hủy đơn (nếu có) */}
              {cancellationRequest && (
                <div className="flex flex-col items-end gap-1.5">
                  <p className="text-xs text-gray-400">Yêu cầu hủy đơn hàng</p>
                  {getCancellationRequestBadge(cancellationRequest.status)}
                </div>
              )}
            </div>

            {/* Component Lịch trình Trạng thái Timeline */}
            <OrderStatusTracker
              status={currentOrder.orderStatus}
              statusHistory={currentOrder.statusHistory}
            />

            {/* Chi tiết các sản phẩm đã mua */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaBox className="text-indigo-600" />
                Sản phẩm đặt mua
              </h2>

              <div className="space-y-4">
                {currentOrder.items.map((item, index) => (
                  <div key={index} className="flex gap-4 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                    <img
                      src={item.coverImage || 'https://via.placeholder.com/120x160'}
                      alt={item.name}
                      className="w-16 h-20 object-cover rounded-xl border border-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">Tác giả: {item.author || 'Đang cập nhật'}</p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-gray-500">
                          {item.price.toLocaleString()} đ x {item.quantity}
                        </p>
                        <p className="font-extrabold text-indigo-600 text-sm">
                          {item.subtotal.toLocaleString()} đ
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tổng thanh toán */}
              <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Tổng tiền hàng</span>
                  <span className="font-semibold text-gray-800">{currentOrder.subtotal.toLocaleString()} đ</span>
                </div>
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Phí giao hàng</span>
                  <span className="font-semibold text-gray-800">{currentOrder.shippingFee.toLocaleString()} đ</span>
                </div>
                <div className="flex justify-between items-center text-lg font-extrabold pt-4 border-t border-gray-100">
                  <span className="text-gray-800">Tổng thanh toán</span>
                  <span className="text-xl text-indigo-600 font-black">
                    {currentOrder.totalAmount.toLocaleString()} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Các hành động Hủy đơn */}
            {(canCancel() || canRequestCancel() || cancellationRequest) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                {canCancel() && (
                  <div>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full py-3 bg-white border-2 border-red-500 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                      <FaTimes />
                      Hủy đơn hàng trực tiếp
                    </button>
                    <p className="text-xxs text-gray-400 text-center mt-2">Đơn hàng đang ở trạng thái mới. Bạn có quyền tự hủy lập tức trong vòng 30 phút đặt đơn.</p>
                  </div>
                )}

                {canRequestCancel() && (
                  <div>
                    <button
                      onClick={() => setShowRequestCancelModal(true)}
                      className="w-full py-3 bg-white border-2 border-orange-500 text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                    >
                      <FaExclamationTriangle />
                      Gửi yêu cầu hủy đơn cho Shop
                    </button>
                    <p className="text-xxs text-gray-400 text-center mt-2">Đơn hàng đã chuyển sang trạng thái <strong>Shop đang chuẩn bị hàng</strong>. Bạn cần gửi yêu cầu để shop duyệt hủy đơn.</p>
                  </div>
                )}

                {cancellationRequest && cancellationRequest.status === 'pending' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-sm font-semibold text-gray-700">Yêu cầu hủy đơn đang chờ duyệt</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Lý do yêu cầu: <strong className="text-gray-700">"{cancellationRequest.reason}"</strong>
                    </p>
                  </div>
                )}
                {cancellationRequest && cancellationRequest.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                      <FaTimes /> Shop đã từ chối yêu cầu hủy đơn hàng
                    </p>
                    {cancellationRequest.shopResponse && (
                      <p className="text-xs text-red-600 mt-2 leading-relaxed">
                        Phản hồi từ shop: <strong className="text-gray-700">"{cancellationRequest.shopResponse}"</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cột phải: Địa chỉ & Thanh toán */}
          <div className="lg:col-span-1 space-y-6">
            {/* Địa chỉ giao hàng */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FaMapMarkerAlt size={16} />
                </div>
                <h2 className="text-base font-bold text-gray-800">Thông tin nhận hàng</h2>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <FaUser className="text-gray-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Người nhận</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{currentOrder.shippingInfo.fullName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FaPhone className="text-gray-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Số điện thoại</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{currentOrder.shippingInfo.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FaMapMarkerAlt className="text-gray-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Địa chỉ giao hàng</p>
                    <p className="font-semibold text-gray-800 mt-0.5 leading-relaxed">{currentOrder.shippingInfo.address}</p>
                  </div>
                </div>

                {currentOrder.shippingInfo.note && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">Ghi chú gửi hàng</p>
                    <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-medium italic">"{currentOrder.shippingInfo.note}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Thông tin thanh toán */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FaMoneyBillWave size={16} />
                </div>
                <h2 className="text-base font-bold text-gray-800">Hình thức thanh toán</h2>
              </div>

              {currentOrder.paymentMethod === 'wallet' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 items-center text-emerald-800">
                  <FaWallet size={20} className="text-emerald-600" />
                  <div>
                    <p className="font-bold text-sm">Ví Điện Tử QR [Mock]</p>
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                      <FaCheckCircle className="text-emerald-500" /> Đã thanh toán thành công
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex gap-3 items-center text-indigo-800">
                  <FaMoneyBillWave size={20} className="text-indigo-600" />
                  <div>
                    <p className="font-bold text-sm">Thanh toán khi nhận hàng (COD)</p>
                    <p className="text-xs text-indigo-500 mt-0.5">Thanh toán tiền mặt khi nhận sách</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL HỦY ĐƠN HÀNG TRỰC TIẾP */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 transform scale-100 transition-all animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 mb-4 text-red-500">
                <FaTimes size={20} className="p-1 bg-red-100 rounded-full" />
                <h3 className="text-lg font-bold text-gray-800">Hủy đơn đặt hàng</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Bạn có chắc chắn muốn hủy đơn hàng này? Thao tác này sẽ tự động khôi phục số lượng tồn kho của sách. Vui lòng ghi rõ lý do hủy.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy đơn hàng của bạn (bắt buộc)..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none mb-4 resize-none text-sm transition-all"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Đóng
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-100"
                >
                  Xác nhận hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL GỬI YÊU CẦU HỦY ĐƠN LÊN SHOP */}
        {showRequestCancelModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 transform scale-100 transition-all animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 mb-4 text-orange-500">
                <FaExclamationTriangle size={20} className="p-1 bg-orange-100 rounded-full" />
                <h3 className="text-lg font-bold text-gray-800">Yêu cầu hủy đơn hàng</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Sách đang ở khâu chuẩn bị giao nhận. Bạn cần gửi yêu cầu giải trình lý do để Admin hệ thống duyệt hủy đơn hàng.
              </p>
              <textarea
                value={requestCancelReason}
                onChange={(e) => setRequestCancelReason(e.target.value)}
                placeholder="Ghi rõ lý do hủy đơn hàng gửi lên shop (bắt buộc)..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none mb-4 resize-none text-sm transition-all"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRequestCancelModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Đóng
                </button>
                <button
                  onClick={handleRequestCancel}
                  disabled={loading}
                  className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-md shadow-orange-100"
                >
                  Gửi yêu cầu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

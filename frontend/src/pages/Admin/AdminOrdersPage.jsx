import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminAPI from '../../api/admin.api';
import toast from 'react-hot-toast';
import { FiSearch, FiFilter, FiEye, FiCheck, FiX, FiActivity, FiXCircle, FiTrendingUp, FiUser, FiInfo, FiCheckCircle } from 'react-icons/fi';

const statusLabels = {
  new: { label: 'Đơn mới (Chờ xác nhận)', color: 'bg-blue-50 border border-blue-200 text-blue-700' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-indigo-50 border border-indigo-200 text-indigo-700' },
  preparing: { label: 'Shop đang chuẩn bị hàng', color: 'bg-amber-50 border border-amber-200 text-amber-700' },
  shipping: { label: 'Đang giao hàng', color: 'bg-purple-50 border border-purple-200 text-purple-700' },
  delivered: { label: 'Đã giao hàng thành công', color: 'bg-emerald-50 border border-emerald-200 text-emerald-700' },
  cancelled: { label: 'Đã hủy đơn hàng', color: 'bg-rose-50 border border-rose-200 text-rose-700' },
};

const nextStatus = {
  new: 'preparing',
  preparing: 'shipping',
  shipping: 'delivered',
};

const nextStatusLabel = {
  preparing: 'Chuẩn bị hàng',
  shipping: 'Giao hàng',
  delivered: 'Hoàn tất giao hàng',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [cancellationRequests, setCancellationRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'cancellations'
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // States xử lý duyệt hủy đơn
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processApproved, setProcessApproved] = useState(true);
  const [shopResponse, setShopResponse] = useState('');

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchCancellationRequests();
    }
  }, [activeTab, filter.status]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.search) params.search = filter.search;
      const data = await adminAPI.getOrders(params);
      const ordersData = data?.data?.orders || data?.orders || data?.data || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      toast.error('Không thể tải danh sách đơn đặt hàng');
    } finally {
      setLoading(false);
    }
  };

  const fetchCancellationRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter.search) params.search = filter.search;
      const data = await adminAPI.getCancellationRequests(params);
      const requestsData = data?.data?.requests || data?.requests || data?.data || [];
      setCancellationRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (error) {
      toast.error('Không thể tải danh sách yêu cầu hủy đơn');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchCancellationRequests();
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await adminAPI.updateOrderStatus(orderId, { status: newStatus });
      toast.success('Cập nhật trạng thái đơn hàng thành công!');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  const handleOpenProcessModal = (request, approved) => {
    setSelectedRequest(request);
    setProcessApproved(approved);
    setShopResponse('');
    setShowProcessModal(true);
  };

  const handleProcessCancellation = async () => {
    try {
      setLoading(true);
      await adminAPI.processCancellationRequest(selectedRequest._id, {
        approved: processApproved,
        shopResponse: shopResponse,
      });
      toast.success(processApproved ? 'Đã phê duyệt hủy đơn hàng thành công!' : 'Đã từ chối hủy đơn hàng.');
      setShowProcessModal(false);
      fetchCancellationRequests();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Xử lý yêu cầu hủy thất bại');
    } finally {
      setLoading(false);
    }
  };

  const viewOrder = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Hệ thống Quản lý Bán hàng</h1>
          <p className="text-sm text-gray-500">Quản trị viên theo dõi đơn hàng và quy trình hủy đơn từ khách hàng</p>
        </div>
        
        {/* Tabs Điều Hướng */}
        <div className="bg-gray-100 p-1 rounded-2xl flex gap-1 self-start">
          <button
            onClick={() => { setActiveTab('orders'); setFilter({ status: '', search: '' }); }}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'orders' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Đơn đặt hàng ({orders.length})
          </button>
          <button
            onClick={() => { setActiveTab('cancellations'); setFilter({ status: '', search: '' }); }}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'cancellations' ? 'bg-white shadow-md text-rose-600' : 'text-gray-500 hover:text-rose-700'
            }`}
          >
            Yêu cầu Hủy đơn ({cancellationRequests.filter(r => r.status === 'pending').length} chờ duyệt)
          </button>
        </div>
      </div>

      {/* Filters & Tìm kiếm */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[260px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'orders' ? "Tìm kiếm mã đơn hàng, tên hoặc email khách..." : "Tìm mã đơn hủy..."}
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all"
              />
            </div>
          </form>
          
          {activeTab === 'orders' && (
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
            >
              <option value="">Tất cả trạng thái đơn</option>
              {Object.entries(statusLabels).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          )}

          <button
            onClick={activeTab === 'orders' ? fetchOrders : fetchCancellationRequests}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 flex items-center gap-2 transition-all"
          >
            <FiFilter size={16} />
            Lọc & Làm mới
          </button>
        </div>
      </div>

      {/* Orders Table hoặc Cancellation Requests Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4 text-xs font-semibold">Đang tải dữ liệu từ máy chủ...</p>
          </div>
        ) : activeTab === 'orders' ? (
          /* TABLE ĐƠN HÀNG */
          orders.length === 0 ? (
            <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center">
              <FiActivity size={48} className="text-gray-300 mb-3" />
              <p className="font-bold text-gray-700">Không có đơn đặt hàng nào!</p>
              <p className="text-xs text-gray-400 mt-1">Các đơn đặt hàng mới sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-gray-100">
                  <tr>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Mã đơn</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Sách mua</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Thanh toán</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày đặt</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-indigo-600">{order.orderNumber}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full font-bold text-xs w-8 h-8 flex items-center justify-center">
                            {order.userId?.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{order.userId?.username || 'N/A'}</p>
                            <p className="text-gray-400 text-xxs mt-0.5">{order.userId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600 font-semibold">{order.items?.length || 0} sản phẩm</td>
                      <td className="py-4 px-6">
                        <p className="font-extrabold text-gray-800">{order.totalAmount?.toLocaleString()}đ</p>
                        <p className="text-xxs text-gray-400 mt-0.5 uppercase font-bold">{order.paymentMethod === 'wallet' ? 'Ví điện tử QR' : 'COD'}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xxs font-bold inline-block shadow-sm ${statusLabels[order.orderStatus]?.color}`}>
                          {statusLabels[order.orderStatus]?.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-500 text-xs font-semibold">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => viewOrder(order)}
                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all"
                            title="Xem chi tiết đơn hàng"
                          >
                            <FiEye size={16} />
                          </button>
                          
                          {/* Phê duyệt chuyển đổi trạng thái thủ công */}
                          {nextStatus[order.orderStatus] && (
                            <button
                              onClick={() => handleUpdateStatus(order._id, nextStatus[order.orderStatus])}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-emerald-100"
                              title={`Chuyển sang: ${statusLabels[nextStatus[order.orderStatus]]?.label}`}
                            >
                              <FiCheckCircle size={12} />
                              {nextStatusLabel[nextStatus[order.orderStatus]]}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TABLE YÊU CẦU HỦY ĐƠN */
          cancellationRequests.length === 0 ? (
            <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center">
              <FiXCircle size={48} className="text-gray-300 mb-3" />
              <p className="font-bold text-gray-700">Không có yêu cầu hủy đơn nào!</p>
              <p className="text-xs text-gray-400 mt-1">Các yêu cầu từ khách hàng ở trạng thái Chuẩn bị hàng sẽ được hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-gray-100">
                  <tr>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Mã đơn</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Lý do khách hàng hủy</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái duyệt</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày gửi</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Xử lý duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {cancellationRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-indigo-600">{request.orderId?.orderNumber || 'N/A'}</td>
                      <td className="py-4 px-6 text-gray-800 font-semibold">
                        <p className="font-bold text-gray-800">{request.userId?.username || 'N/A'}</p>
                        <p className="text-gray-400 text-xxs mt-0.5">{request.userId?.email}</p>
                      </td>
                      <td className="py-4 px-6 text-gray-600 italic">
                        "{request.reason}"
                      </td>
                      <td className="py-4 px-6">
                        {request.status === 'pending' && <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xxs font-bold border border-amber-200">Chờ phê duyệt</span>}
                        {request.status === 'approved' && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xxs font-bold border border-emerald-200">Đã đồng ý hủy</span>}
                        {request.status === 'rejected' && <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-full text-xxs font-bold border border-slate-200">Bị từ chối</span>}
                      </td>
                      <td className="py-4 px-6 text-gray-500 text-xs font-semibold">
                        {new Date(request.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {request.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleOpenProcessModal(request, true)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-50"
                              >
                                Đồng ý hủy
                              </button>
                              <button
                                onClick={() => handleOpenProcessModal(request, false)}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-50"
                              >
                                Từ chối
                              </button>
                            </>
                          ) : (
                            <span className="text-xxs text-gray-400 font-semibold italic">Đã xử lý (Phản hồi: "{request.shopResponse || 'Không có'}")</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* MODAL CHI TIẾT ĐƠN HÀNG */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col transform scale-100 transition-all animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Hóa đơn chi tiết</h2>
                <p className="text-xxs text-gray-400">Xem toàn bộ thông tin đặt mua sách</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
                <FiX size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">Mã đơn hàng</p>
                  <p className="font-mono font-bold text-indigo-600 text-base mt-0.5">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Trạng thái giao nhận</p>
                  <span className={`px-2.5 py-1 rounded-full text-xxs font-bold mt-1 inline-block shadow-sm ${statusLabels[selectedOrder.orderStatus]?.color}`}>
                    {statusLabels[selectedOrder.orderStatus]?.label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Thông tin khách hàng</p>
                  <p className="font-bold text-gray-800 mt-0.5">{selectedOrder.userId?.username}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{selectedOrder.userId?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ngày đặt mua</p>
                  <p className="text-gray-800 font-semibold mt-0.5">{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                  <FiUser className="text-indigo-600" />
                  Địa chỉ và Liên hệ Nhận hàng
                </h3>
                <div className="border border-gray-100 rounded-2xl p-4 space-y-2 text-sm bg-white">
                  <p className="text-gray-700"><span className="font-semibold text-gray-800">Người nhận:</span> {selectedOrder.shippingInfo?.fullName}</p>
                  <p className="text-gray-700"><span className="font-semibold text-gray-800">Điện thoại:</span> {selectedOrder.shippingInfo?.phone}</p>
                  <p className="text-gray-700 leading-relaxed"><span className="font-semibold text-gray-800">Địa chỉ:</span> {selectedOrder.shippingInfo?.address}</p>
                  {selectedOrder.shippingInfo?.note && (
                    <p className="text-xs text-gray-400 italic bg-slate-50 p-2 border border-dashed rounded-lg mt-2">Ghi chú: "{selectedOrder.shippingInfo.note}"</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Sách đã đặt hàng</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 bg-slate-50/50 border border-gray-100 rounded-2xl p-3">
                      <img
                        src={item.coverImage || 'https://via.placeholder.com/80'}
                        alt={item.name}
                        className="w-12 h-16 object-cover rounded-xl border border-gray-100"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Tác giả: {item.author}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-indigo-600">{item.subtotal?.toLocaleString()}đ</p>
                        <p className="text-xs text-gray-400 mt-0.5">Số lượng: x{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Tiền hàng</span>
                  <span className="font-semibold text-gray-800">{selectedOrder.subtotal?.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí giao hàng</span>
                  <span className="font-semibold text-gray-800">{selectedOrder.shippingFee?.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between font-bold text-base text-gray-800 pt-2 border-t border-gray-100">
                  <span>Tổng giá trị đơn</span>
                  <span className="text-lg text-indigo-600 font-extrabold">{selectedOrder.totalAmount?.toLocaleString()}đ</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-all text-sm"
              >
                Đóng
              </button>
              
              {nextStatus[selectedOrder.orderStatus] && (
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedOrder._id, nextStatus[selectedOrder.orderStatus]);
                    setShowModal(false);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-100 transition-all"
                >
                  Duyệt: {statusLabels[nextStatus[selectedOrder.orderStatus]]?.label}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DUYỆT / TỪ CHỐI HỦY ĐƠN HÀNG */}
      {showProcessModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 transform scale-100 transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              {processApproved ? (
                <FiCheckCircle size={24} className="p-1 bg-emerald-100 text-emerald-600 rounded-full" />
              ) : (
                <FiXCircle size={24} className="p-1 bg-rose-100 text-rose-600 rounded-full" />
              )}
              <h3 className="text-lg font-bold text-gray-800">
                {processApproved ? 'Chấp thuận duyệt hủy đơn' : 'Từ chối yêu cầu hủy đơn'}
              </h3>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-gray-100 space-y-2 text-xs text-gray-600">
              <p><span className="font-semibold text-gray-800">Mã đơn đặt hàng:</span> {selectedRequest.orderId?.orderNumber}</p>
              <p><span className="font-semibold text-gray-800">Khách hàng yêu cầu:</span> {selectedRequest.userId?.username}</p>
              <p className="italic bg-white p-2 rounded-lg border border-dashed text-gray-500 mt-1">Lý do khách hàng hủy: "{selectedRequest.reason}"</p>
            </div>

            <label className="block text-xs font-semibold text-gray-700 mb-2">Phản hồi của Shop gửi khách hàng</label>
            <textarea
              value={shopResponse}
              onChange={(e) => setShopResponse(e.target.value)}
              placeholder="Nhập lý do duyệt/từ chối để phản hồi cho khách hàng..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none mb-4 resize-none text-sm transition-all"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowProcessModal(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-500 font-semibold rounded-xl hover:bg-gray-50 transition-all"
              >
                Đóng
              </button>
              <button
                onClick={handleProcessCancellation}
                disabled={loading}
                className={`flex-1 py-3 text-white font-bold rounded-xl transition-all shadow-md ${
                  processApproved ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                }`}
              >
                {processApproved ? 'Xác nhận duyệt hủy' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

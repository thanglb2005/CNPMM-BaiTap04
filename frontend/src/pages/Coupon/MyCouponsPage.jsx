import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaTicketAlt, FaTag, FaClock, FaCheck, FaTimes, FaGift } from 'react-icons/fa';
import Layout from '../../components/Layout/Layout';
import { fetchMyCoupons } from '../../store/slices/couponSlice';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

export default function MyCouponsPage() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { myCoupons, loading } = useSelector((state) => state.coupon);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyCoupons(activeTab));
    }
  }, [dispatch, isAuthenticated, activeTab]);

  const getCouponIcon = (coupon) => {
    if (coupon.couponType === 'free_shipping') {
      return <FaGift className="text-blue-500" />;
    }
    return <FaTag className="text-red-500" />;
  };

  const formatDate = (date) => {
    if (!date) return 'Không giới hạn';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const getCouponValue = (coupon) => {
    if (coupon.couponType === 'percentage') {
      return `${coupon.discountValue}%`;
    } else if (coupon.couponType === 'fixed_amount') {
      return `${coupon.discountValue?.toLocaleString('vi-VN')}đ`;
    } else {
      return 'Miễn phí vận chuyển';
    }
  };

  const coupons = Array.isArray(myCoupons) ? myCoupons : [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <FaTicketAlt className="text-3xl text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Phiếu giảm giá của tôi</h1>
            <p className="text-gray-500">Quản lý các mã giảm giá của bạn</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          {[
            { key: 'available', label: 'Khả dụng', icon: FaCheck },
            { key: 'used', label: 'Đã sử dụng', icon: FaTimes },
            { key: 'expired', label: 'Hết hạn', icon: FaClock },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 px-2 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="text-sm" />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16">
            <FaTicketAlt className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-500 mb-2">
              {activeTab === 'available'
                ? 'Chưa có phiếu giảm giá nào'
                : activeTab === 'used'
                ? 'Chưa có phiếu đã sử dụng'
                : 'Chưa có phiếu hết hạn'}
            </h2>
            <p className="text-gray-400 mb-6">
              {activeTab === 'available'
                ? 'Đánh giá sản phẩm hoặc mua hàng để nhận phiếu giảm giá!'
                : 'Danh sách sẽ được cập nhật khi bạn sử dụng hoặc hết hạn phiếu giảm giá'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {coupons.map((coupon, index) => (
              <div
                key={coupon._id || index}
                className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                  activeTab !== 'available' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex">
                  {/* Left side - Value */}
                  <div className="w-32 bg-gradient-to-br from-blue-600 to-blue-700 text-white flex flex-col items-center justify-center p-4">
                    {getCouponIcon(coupon)}
                    <span className="text-2xl font-bold mt-2">{getCouponValue(coupon)}</span>
                    <span className="text-xs opacity-80">Giảm giá</span>
                  </div>

                  {/* Right side - Details */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{coupon.name}</h3>
                        <p className="text-gray-500 text-sm mt-1">{coupon.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>Đơn tối thiểu: {coupon.minOrderAmount?.toLocaleString('vi-VN') || 0}đ</span>
                          {coupon.maxDiscountAmount && (
                            <span>Giảm tối đa: {coupon.maxDiscountAmount.toLocaleString('vi-VN')}đ</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-gray-100 px-3 py-1 rounded font-mono font-bold text-lg">
                          {coupon.code}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FaClock />
                        {activeTab === 'available' ? (
                          <span>Hết hạn: {formatDate(coupon.endDate)}</span>
                        ) : activeTab === 'used' ? (
                          <span>Đã dùng: {formatDate(coupon.usedAt)}</span>
                        ) : (
                          <span>Hết hạn: {formatDate(coupon.endDate)}</span>
                        )}
                      </div>
                      {coupon.acquiredFrom && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {coupon.acquiredFrom === 'review_reward'
                            ? 'Thưởng đánh giá'
                            : coupon.acquiredFrom === 'purchase_reward'
                            ? 'Thưởng mua hàng'
                            : coupon.acquiredFrom === 'system'
                            ? 'Hệ thống'
                            : 'Khác'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

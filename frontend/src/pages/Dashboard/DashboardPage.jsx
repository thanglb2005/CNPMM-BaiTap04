import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectUser } from '../../store/slices/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { fetchMyPoints } from '../../store/slices/loyaltySlice';
import { fetchFavoritesCount } from '../../store/slices/favoriteSlice';
import { fetchMyCoupons } from '../../store/slices/couponSlice';
import { FiLogOut, FiUser, FiMail, FiShield, FiHeart, FiStar, FiGift, FiClock, FiShoppingBag } from 'react-icons/fi';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const { logout, loading } = useAuth();
  const { points } = useSelector((state) => state.loyalty);
  const { count: favoritesCount } = useSelector((state) => state.favorite);
  const { myCoupons } = useSelector((state) => state.coupon);
  const { myReviews } = useSelector((state) => state.review);

  useEffect(() => {
    if (user) {
      dispatch(fetchMyPoints());
      dispatch(fetchFavoritesCount());
      dispatch(fetchMyCoupons('available'));
    }
  }, [dispatch, user]);

  const couponsCount = Array.isArray(myCoupons) ? myCoupons.length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900
                    flex items-center justify-center px-4 py-12">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8
                      w-full max-w-2xl shadow-2xl shadow-black/40 animate-slide-up">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-700
                          rounded-full flex items-center justify-center mx-auto mb-4
                          text-3xl font-bold text-white shadow-lg shadow-brand-600/30">
            {user?.username?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Chào mừng, {user?.username || 'bạn'}! 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">Chào mừng bạn quay trở lại BookStore</p>
        </div>

        {/* User Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {user?.email && (
            <div className="flex items-center gap-3 bg-dark-700 rounded-xl px-4 py-3">
              <FiMail className="text-brand-400 flex-shrink-0" size={18} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-mono">Email</p>
                <p className="text-gray-200 text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
          )}
          {user?.username && (
            <div className="flex items-center gap-3 bg-dark-700 rounded-xl px-4 py-3">
              <FiUser className="text-brand-400 flex-shrink-0" size={18} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-mono">Tên đăng nhập</p>
                <p className="text-gray-200 text-sm font-medium">{user.username}</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Link
            to="/loyalty"
            className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 hover:bg-yellow-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <FiGift className="text-yellow-500" size={20} />
              <span className="text-2xl font-bold text-yellow-500">
                {points?.currentBalance?.toLocaleString() || 0}
              </span>
            </div>
            <p className="text-xs text-gray-400">Điểm tích lũy</p>
          </Link>

          <Link
            to="/favorites"
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 hover:bg-red-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <FiHeart className="text-red-500" size={20} />
              <span className="text-2xl font-bold text-red-500">{favoritesCount}</span>
            </div>
            <p className="text-xs text-gray-400">Yêu thích</p>
          </Link>

          <Link
            to="/my-coupons"
            className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 hover:bg-blue-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <FiGift className="text-blue-500" size={20} />
              <span className="text-2xl font-bold text-blue-500">{couponsCount}</span>
            </div>
            <p className="text-xs text-gray-400">Phiếu giảm giá</p>
          </Link>

          <Link
            to="/my-reviews"
            className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 hover:bg-green-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <FiStar className="text-green-500" size={20} />
              <span className="text-2xl font-bold text-green-500">
                {Array.isArray(myReviews) ? myReviews.length : 0}
              </span>
            </div>
            <p className="text-xs text-gray-400">Đánh giá</p>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="bg-dark-700 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Truy cập nhanh</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link
              to="/favorites"
              className="flex items-center gap-2 px-3 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition-colors text-sm"
            >
              <FiHeart className="text-red-500" size={16} />
              <span className="text-gray-200">Yêu thích</span>
            </Link>
            <Link
              to="/my-reviews"
              className="flex items-center gap-2 px-3 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition-colors text-sm"
            >
              <FiStar className="text-yellow-500" size={16} />
              <span className="text-gray-200">Đánh giá</span>
            </Link>
            <Link
              to="/my-coupons"
              className="flex items-center gap-2 px-3 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition-colors text-sm"
            >
              <FiGift className="text-blue-500" size={16} />
              <span className="text-gray-200">Mã giảm giá</span>
            </Link>
            <Link
              to="/recently-viewed"
              className="flex items-center gap-2 px-3 py-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition-colors text-sm"
            >
              <FiClock className="text-purple-500" size={16} />
              <span className="text-gray-200">Đã xem</span>
            </Link>
          </div>
        </div>

        {/* Orders Link */}
        <Link
          to="/orders"
          className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 text-white
                     py-3 rounded-xl font-medium transition-colors mb-4"
        >
          <FiShoppingBag size={18} />
          Xem đơn hàng của tôi
        </Link>

        {/* Logout */}
        <button
          onClick={logout}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full bg-dark-700 hover:bg-dark-600 text-gray-400
                     py-3 rounded-xl font-medium transition-colors"
        >
          <FiLogOut size={18} />
          {loading ? 'Đang đăng xuất...' : 'Đăng xuất'}
        </button>
      </div>
    </div>
  );
}

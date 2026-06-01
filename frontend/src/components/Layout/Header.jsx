import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, selectIsAuthenticated } from '../../store/slices/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { fetchCart } from '../../store/slices/cartSlice';
import { fetchFavoritesCount } from '../../store/slices/favoriteSlice';
import { fetchMyPoints } from '../../store/slices/loyaltySlice';
import { FaShoppingCart, FaBox, FaHeart, FaCoins, FaTag, FaHistory, FaStar } from 'react-icons/fa';

export default function Header() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { logout, loading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { cart } = useSelector((state) => state.cart);
  const { count: favoritesCount } = useSelector((state) => state.favorite);
  const { points } = useSelector((state) => state.loyalty);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
      dispatch(fetchFavoritesCount());
      dispatch(fetchMyPoints());
    }
  }, [dispatch, isAuthenticated]);

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search)}`);
      setSearch('');
    }
  };

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link to="/home" className="text-xl font-bold text-blue-600">📚 BookStore</Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
            <input
              type="text"
              placeholder="Tìm kiếm sách..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm"
            />
          </form>

          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <>
                <Link
                  to="/favorites"
                  className="relative p-2 text-gray-600 hover:text-red-500 transition-colors"
                  title="Yêu thích"
                >
                  <FaHeart size={22} />
                  {favoritesCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {favoritesCount > 99 ? '99+' : favoritesCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/cart"
                  className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
                  title="Giỏ hàng"
                >
                  <FaShoppingCart size={22} />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                </Link>

                {points?.currentBalance > 0 && (
                  <Link
                    to="/loyalty"
                    className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium"
                    title="Điểm tích lũy"
                  >
                    <FaCoins />
                    {points.currentBalance.toLocaleString()}
                  </Link>
                )}
              </>
            )}

            {isAuthenticated ? (
              <>
                <span className="text-gray-600 text-sm">Xin chào, {user?.username}</span>
                <button onClick={handleLogout} disabled={loading} className="text-blue-600 hover:underline text-sm">
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link to="/login" className="text-blue-600 hover:underline text-sm">Đăng nhập</Link>
            )}
          </div>
        </div>

        <nav className="flex gap-4 py-2 border-t text-sm overflow-x-auto">
          <Link to="/home" className="hover:text-blue-600 whitespace-nowrap">Trang chủ</Link>
          <Link to="/products" className="hover:text-blue-600 whitespace-nowrap">Tất cả sách</Link>
          <Link to="/news" className="hover:text-blue-600 whitespace-nowrap">Tin tức</Link>
          {isAuthenticated && (
            <>
              <Link to="/orders" className="hover:text-blue-600 flex items-center gap-1 whitespace-nowrap">
                <FaBox size={14} />
                Đơn hàng
              </Link>
              <Link to="/favorites" className="hover:text-blue-600 flex items-center gap-1 whitespace-nowrap">
                <FaHeart size={14} />
                Yêu thích
              </Link>
              <Link to="/my-coupons" className="hover:text-blue-600 flex items-center gap-1 whitespace-nowrap">
                <FaTag size={14} />
                Mã giảm giá
              </Link>
              <Link to="/loyalty" className="hover:text-blue-600 flex items-center gap-1 whitespace-nowrap">
                <FaCoins size={14} />
                Tích điểm
              </Link>
              <Link to="/recently-viewed" className="hover:text-blue-600 flex items-center gap-1 whitespace-nowrap">
                <FaHistory size={14} />
                Đã xem
              </Link>
              <Link to="/my-reviews" className="hover:text-blue-600 flex items-center gap-1 whitespace-nowrap">
                <FaStar size={14} />
                Đánh giá
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 whitespace-nowrap">
                  <FaBox size={14} />
                  Quản trị
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

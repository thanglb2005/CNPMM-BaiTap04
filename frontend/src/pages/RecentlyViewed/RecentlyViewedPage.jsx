import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FaHistory, FaTrash, FaEye } from 'react-icons/fa';
import Layout from '../../components/Layout/Layout';
import { recentlyViewedAPI } from '../../api/recentlyViewed.api';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import { addToCart, fetchCart } from '../../store/slices/cartSlice';
import ProductCard from '../../components/ProductCard/ProductCard';
import toast from 'react-hot-toast';

export default function RecentlyViewedPage() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await recentlyViewedAPI.getRecentlyViewed({ limit: 20 });
        setProducts(response.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentlyViewed();
  }, [isAuthenticated]);

  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử xem?')) return;
    try {
      await recentlyViewedAPI.clearRecentlyViewed();
      setProducts([]);
      toast.success('Đã xóa lịch sử xem');
    } catch (error) {
      toast.error('Lỗi khi xóa lịch sử');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaHistory className="text-3xl text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Sản phẩm đã xem</h1>
              <p className="text-gray-500">{products.length} sản phẩm</p>
            </div>
          </div>
          {products.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-red-500 hover:text-red-600 flex items-center gap-2"
            >
              <FaTrash />
              Xóa lịch sử
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <FaEye className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-500 mb-2">Chưa có sản phẩm nào được xem</h2>
            <p className="text-gray-400 mb-6">Hãy khám phá các sản phẩm của chúng tôi!</p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

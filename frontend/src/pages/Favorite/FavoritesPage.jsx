import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FaHeart, FaTrash, FaShoppingCart } from 'react-icons/fa';
import Layout from '../../components/Layout/Layout';
import { fetchMyFavorites, removeFavorite, clearAllFavorites } from '../../store/slices/favoriteSlice';
import { addToCart, fetchCart } from '../../store/slices/cartSlice';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

export default function FavoritesPage() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { favorites, count, loading } = useSelector((state) => state.favorite);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyFavorites({ page: 1, limit: 12 }));
    }
  }, [dispatch, isAuthenticated]);

  const handleRemoveFavorite = async (productId) => {
    try {
      await dispatch(removeFavorite(productId)).unwrap();
      toast.success('Đã xóa khỏi yêu thích');
    } catch (error) {
      toast.error(error || 'Lỗi khi xóa');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa tất cả sản phẩm yêu thích?')) return;
    try {
      await dispatch(clearAllFavorites()).unwrap();
      toast.success('Đã xóa tất cả sản phẩm yêu thích');
    } catch (error) {
      toast.error(error || 'Lỗi khi xóa');
    }
  };

  const handleAddToCart = async (product) => {
    if (product.stockQuantity < 1) {
      toast.error('Sản phẩm đã hết hàng');
      return;
    }
    try {
      await dispatch(addToCart({ productId: product._id, quantity: 1 })).unwrap();
      dispatch(fetchCart());
      toast.success('Đã thêm vào giỏ hàng!');
    } catch (error) {
      toast.error(error || 'Lỗi khi thêm vào giỏ hàng');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Sản phẩm yêu thích</h1>
            <p className="text-gray-500">{count} sản phẩm</p>
          </div>
          {favorites.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-red-500 hover:text-red-600 flex items-center gap-2"
            >
              <FaTrash />
              Xóa tất cả
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <FaHeart className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-500 mb-2">Chưa có sản phẩm yêu thích</h2>
            <p className="text-gray-400 mb-6">Hãy thêm những sản phẩm bạn thích vào đây!</p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favorites.map((product) => (
              <div key={product._id} className="bg-white rounded-lg shadow-sm hover:shadow-md overflow-hidden">
                <Link to={`/product/${product.slug}`} className="block">
                  <div className="aspect-[3/4] bg-gray-100">
                    <img
                      src={product.coverImage || 'https://via.placeholder.com/200'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
                <div className="p-3">
                  <Link to={`/product/${product.slug}`}>
                    <h3 className="font-medium text-sm line-clamp-2 mb-1 hover:text-blue-600">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-gray-500 text-xs mb-2">{product.author}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-blue-600">
                        {product.salePrice?.toLocaleString() || product.price?.toLocaleString()}đ
                      </p>
                      {product.salePrice && (
                        <p className="text-gray-400 text-xs line-through">
                          {product.price?.toLocaleString()}đ
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        title="Thêm vào giỏ hàng"
                      >
                        <FaShoppingCart className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleRemoveFavorite(product._id)}
                        className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500"
                        title="Xóa khỏi yêu thích"
                      >
                        <FaTrash className="text-sm" />
                      </button>
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

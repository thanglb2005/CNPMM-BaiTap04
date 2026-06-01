import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { toggleFavorite, checkFavorite } from '../../store/slices/favoriteSlice';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { favoriteIds } = useSelector((state) => state.favorite);
  const [toggling, setToggling] = useState(false);

  const isFavorite = favoriteIds[product._id];

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào yêu thích');
      return;
    }

    setToggling(true);
    try {
      await dispatch(toggleFavorite(product._id)).unwrap();
    } catch (error) {
      toast.error(error || 'Lỗi khi cập nhật yêu thích');
    } finally {
      setToggling(false);
    }
  };

  return (
    <Link to={`/product/${product.slug}`} className="bg-white rounded-lg shadow-sm hover:shadow-md p-4 block relative">
      <div className="aspect-[3/4] bg-gray-100 rounded mb-3 overflow-hidden">
        <img
          src={product.coverImage || 'https://via.placeholder.com/200'}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {product.isNew && (
          <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
            Mới
          </span>
        )}
        {product.isOnSale && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
            -{product.discountPercent}%
          </span>
        )}
      </div>

      <button
        onClick={handleToggleFavorite}
        disabled={toggling}
        className="absolute top-4 right-4 p-2 bg-white rounded-full shadow hover:shadow-md z-10 transition-all"
      >
        {isFavorite ? (
          <FaHeart className="text-red-500 text-lg" />
        ) : (
          <FaRegHeart className="text-gray-400 hover:text-red-500 text-lg" />
        )}
      </button>

      <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
      <p className="text-gray-500 text-xs mb-1">{product.author}</p>

      {product.rating > 0 && (
        <p className="text-yellow-500 text-xs mb-1">
          ★ {product.rating.toFixed(1)} ({product.reviewCount || 0})
        </p>
      )}

      <div className="flex items-center gap-2">
        <p className="font-bold text-blue-600">
          {product.salePrice?.toLocaleString() || product.price?.toLocaleString()}đ
        </p>
        {product.salePrice && (
          <p className="text-gray-400 text-xs line-through">
            {product.price?.toLocaleString()}đ
          </p>
        )}
      </div>
    </Link>
  );
}

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { FaShoppingCart, FaHeart, FaRegHeart, FaStar, FaUser, FaComment } from 'react-icons/fa';
import Layout from '../../components/Layout/Layout';
import { productAPI } from '../../api/product.api';
import { addToCart, fetchCart } from '../../store/slices/cartSlice';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import { fetchProductReviews, createReview, checkCanReview } from '../../store/slices/reviewSlice';
import { toggleFavorite, checkFavorite } from '../../store/slices/favoriteSlice';
import { recentlyViewedAPI, productStatsAPI } from '../../api/recentlyViewed.api';
import toast from 'react-hot-toast';
import Rating from '../../components/Rating/Rating';
import ProductCard from '../../components/ProductCard/ProductCard';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [productStats, setProductStats] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', content: '' });
  const [reviewPage, setReviewPage] = useState(1);

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { favoriteIds } = useSelector((state) => state.favorite);
  const { reviews, ratingDistribution, canReview, loading: reviewLoading } = useSelector((state) => state.review);
  const { user } = useSelector((state) => state.auth);

  const isFavorite = product ? favoriteIds[product._id] : false;

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        const response = await productAPI.getProductBySlug(slug);
        if (response.data?.product) {
          const prod = response.data.product;
          setProduct(prod);
          setRelatedProducts(response.data.relatedProducts || []);

          // Add to recently viewed
          recentlyViewedAPI.addToRecentlyViewed(prod._id).catch(() => {});

          // Get product stats
          try {
            const stats = await productStatsAPI.getProductStats(prod._id);
            setProductStats(stats.data);
          } catch (e) {}

          // Check if favorited
          if (isAuthenticated) {
            dispatch(checkFavorite(prod._id));
          }

          // Fetch reviews
          dispatch(fetchProductReviews({ productId: prod._id, params: { page: 1, limit: 5 } }));
          if (isAuthenticated) {
            dispatch(checkCanReview(prod._id));
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductData();
  }, [slug, isAuthenticated, dispatch]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
      navigate('/login');
      return;
    }

    if (product.stockQuantity < quantity) {
      toast.error('Số lượng vượt quá tồn kho');
      return;
    }

    setAddingToCart(true);
    try {
      await dispatch(addToCart({ productId: product._id, quantity })).unwrap();
      dispatch(fetchCart());
      toast.success('Đã thêm vào giỏ hàng!');
    } catch (error) {
      toast.error(error || 'Không thể thêm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào yêu thích');
      navigate('/login');
      return;
    }
    try {
      await dispatch(toggleFavorite(product._id)).unwrap();
      toast.success(isFavorite ? 'Đã xóa khỏi yêu thích' : 'Đã thêm vào yêu thích');
    } catch (error) {
      toast.error(error || 'Lỗi khi cập nhật yêu thích');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.content.trim()) {
      toast.error('Vui lòng nhập nội dung đánh giá');
      return;
    }
    try {
      const result = await dispatch(createReview({
        productId: product._id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        content: reviewForm.content,
      })).unwrap();

      toast.success(result.message || 'Cảm ơn bạn đã đánh giá!');
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: '', content: '' });
      dispatch(checkCanReview(product._id));
    } catch (error) {
      toast.error(error || 'Lỗi khi gửi đánh giá');
    }
  };

  const loadMoreReviews = () => {
    const nextPage = reviewPage + 1;
    setReviewPage(nextPage);
    dispatch(fetchProductReviews({ productId: product._id, params: { page: nextPage, limit: 5 } }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded-lg" />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-12 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-xl mb-4">Không tìm thấy sản phẩm</h1>
          <Link to="/products" className="text-blue-600 hover:underline">← Quay lại</Link>
        </div>
      </Layout>
    );
  }

  const images = product.images?.length > 0
    ? product.images
    : product.coverImage
      ? [product.coverImage]
      : ['https://via.placeholder.com/400x600'];

  const totalReviews = Object.values(ratingDistribution).reduce((a, b) => a + b, 0);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <Link to="/home" className="text-gray-500 hover:text-blue-600">Trang chủ</Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link to="/products" className="text-gray-500 hover:text-blue-600">Sách</Link>
          {product.category && (
            <>
              <span className="mx-2 text-gray-400">/</span>
              <Link
                to={`/products?category=${product.category.slug}`}
                className="text-gray-500 hover:text-blue-600"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-700">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Hình ảnh */}
          <div className="relative">
            <Swiper modules={[Navigation]} navigation className="mb-4">
              {images.map((img, i) => (
                <SwiperSlide key={i}>
                  <img src={img} alt={product.name} className="w-full rounded-lg" />
                </SwiperSlide>
              ))}
            </Swiper>
            {/* Favorite button */}
            <button
              onClick={handleToggleFavorite}
              className="absolute top-4 right-4 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all z-10"
            >
              {isFavorite ? (
                <FaHeart className="text-2xl text-red-500" />
              ) : (
                <FaRegHeart className="text-2xl text-gray-400 hover:text-red-500" />
              )}
            </button>
          </div>

          {/* Thông tin */}
          <div>
            {product.category && (
              <span className="inline-block bg-blue-100 text-blue-600 text-xs px-3 py-1 rounded-full mb-3">
                {product.category.name}
              </span>
            )}
            <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
            <p className="text-gray-600 mb-1">Tác giả: <span className="font-medium">{product.author}</span></p>
            {product.publisher && (
              <p className="text-gray-600 mb-1">Nhà xuất bản: <span className="font-medium">{product.publisher}</span></p>
            )}

            {/* Rating */}
            <div className="flex items-center gap-4 my-3">
              <div className="flex items-center">
                <Rating value={product.rating || 0} />
                <span className="ml-2 text-gray-600">
                  {product.rating ? product.rating.toFixed(1) : '0'} ({product.reviewCount || 0} đánh giá)
                </span>
              </div>
            </div>

            {/* Stats */}
            {productStats && (
              <div className="flex gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <FaUser className="text-gray-400" />
                  <span>{productStats.buyerCount || 0} khách mua</span>
                </div>
                <div className="flex items-center gap-1">
                  <FaComment className="text-gray-400" />
                  <span>{productStats.reviewerCount || 0} bình luận</span>
                </div>
              </div>
            )}

            {/* Giá */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-red-500">
                  {product.salePrice?.toLocaleString() || product.price?.toLocaleString()}đ
                </span>
                {product.salePrice && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      {product.price?.toLocaleString()}đ
                    </span>
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                      -{product.discountPercent || Math.round((1 - product.salePrice / product.price) * 100)}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Tồn kho */}
            <div className="text-sm text-gray-500 mb-4">
              {product.stockQuantity > 0 ? (
                <p>Còn <span className="font-medium text-green-600">{product.stockQuantity}</span> cuốn</p>
              ) : (
                <p className="text-red-500 font-medium">Hết hàng</p>
              )}
              {product.soldQuantity > 0 && (
                <p>Đã bán: <span className="font-medium">{product.soldQuantity}</span></p>
              )}
            </div>

            {/* Số lượng */}
            <div className="flex items-center gap-4 mb-6">
              <span className="font-medium">Số lượng:</span>
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-gray-100"
                >
                  -
                </button>
                <span className="px-4 py-2 border-x">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Nút */}
            <button
              onClick={handleAddToCart}
              disabled={addingToCart || product.stockQuantity < 1}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
            >
              {addingToCart ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Đang thêm...
                </>
              ) : (
                <>
                  <FaShoppingCart />
                  Thêm vào giỏ hàng
                </>
              )}
            </button>

            <Link to="/products" className="block text-center text-blue-600 hover:underline">
              ← Quay lại danh sách sách
            </Link>
          </div>
        </div>

        {/* Mô tả */}
        {product.description && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">Mô tả sản phẩm</h2>
            <div className="bg-white rounded-lg p-6 text-gray-600 whitespace-pre-line">
              {product.description}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Đánh giá sản phẩm</h2>
            {canReview?.canReview && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {showReviewForm ? 'Đóng' : 'Viết đánh giá'}
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="bg-white rounded-lg p-6 mb-6 shadow">
              <h3 className="font-medium mb-4">Đánh giá của bạn</h3>
              {canReview?.isVerifiedPurchase && (
                <div className="bg-green-50 text-green-700 text-sm p-3 rounded mb-4">
                  ✓ Bạn đã mua sản phẩm này. Đánh giá này sẽ được hiển thị là "Đã mua hàng".
                </div>
              )}
              <div className="bg-yellow-50 text-yellow-700 text-sm p-3 rounded mb-4">
                🎁 Đánh giá sản phẩm: Nhận 50 điểm tích lũy + 1 mã giảm giá 10%!
              </div>
              <form onSubmit={handleSubmitReview}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Số sao</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="text-2xl"
                      >
                        {star <= reviewForm.rating ? (
                          <FaStar className="text-yellow-400" />
                        ) : (
                          <FaStar className="text-gray-300" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Tiêu đề (tùy chọn)</label>
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                    placeholder="Tóm tắt đánh giá của bạn"
                    className="w-full border rounded-lg px-4 py-2"
                    maxLength={200}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Nội dung *</label>
                  <textarea
                    value={reviewForm.content}
                    onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                    placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                    className="w-full border rounded-lg px-4 py-2 h-32"
                    maxLength={2000}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {reviewLoading ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </form>
            </div>
          )}

          {/* Rating Distribution */}
          {totalReviews > 0 && (
            <div className="bg-white rounded-lg p-6 mb-6 shadow">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">{product.rating?.toFixed(1) || '0'}</div>
                  <Rating value={product.rating || 0} />
                  <div className="text-sm text-gray-500 mt-1">{totalReviews} đánh giá</div>
                </div>
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2 mb-1">
                      <span className="text-sm w-8">{star} ★</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${totalReviews > 0 ? (ratingDistribution[star] / totalReviews) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-8">{ratingDistribution[star] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="bg-white rounded-lg p-4 shadow">
                  <div className="flex items-start gap-3">
                    <img
                      src={review.userId?.avatar || `https://ui-avatars.com/api/?name=${review.userId?.username || 'U'}`}
                      alt={review.userId?.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.userId?.username || 'Người dùng'}</span>
                        {review.isVerifiedPurchase && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Đã mua hàng</span>
                        )}
                        {review.isEdited && (
                          <span className="text-gray-400 text-xs">(đã chỉnh sửa)</span>
                        )}
                      </div>
                      <Rating value={review.rating} size="sm" />
                      {review.title && <p className="font-medium mt-1">{review.title}</p>}
                      <p className="text-gray-600 mt-1">{review.content}</p>
                      <p className="text-gray-400 text-xs mt-2">
                        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={loadMoreReviews}
                className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                Xem thêm đánh giá
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!</p>
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-6">Sản phẩm tương tự</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.slice(0, 8).map((prod) => (
                <ProductCard key={prod._id} product={prod} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

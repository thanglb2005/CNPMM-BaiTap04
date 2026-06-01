import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FaStar, FaEdit, FaTrash } from 'react-icons/fa';
import Layout from '../../components/Layout/Layout';
import { fetchMyReviews, deleteReview } from '../../store/slices/reviewSlice';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import Rating from '../../components/Rating/Rating';
import toast from 'react-hot-toast';

export default function MyReviewsPage() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { myReviews, loading } = useSelector((state) => state.review);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyReviews({ page: 1, limit: 10 }));
    }
  }, [dispatch, isAuthenticated]);

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Bạn có chắc muốn xóa đánh giá này?')) return;
    try {
      await dispatch(deleteReview(reviewId)).unwrap();
      toast.success('Đã xóa đánh giá');
    } catch (error) {
      toast.error(error || 'Lỗi khi xóa đánh giá');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <FaStar className="text-3xl text-yellow-500" />
          <div>
            <h1 className="text-2xl font-bold">Đánh giá của tôi</h1>
            <p className="text-gray-500">{myReviews.length} đánh giá</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : myReviews.length === 0 ? (
          <div className="text-center py-16">
            <FaStar className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-500 mb-2">Bạn chưa có đánh giá nào</h2>
            <p className="text-gray-400 mb-6">Mua hàng và đánh giá sản phẩm để nhận điểm tích lũy!</p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myReviews.map((review) => (
              <div key={review._id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start gap-4">
                  <Link to={`/product/${review.productId?.slug}`} className="w-20 h-28 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={review.productId?.coverImage || 'https://via.placeholder.com/80'}
                      alt={review.productId?.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          to={`/product/${review.productId?.slug}`}
                          className="font-medium hover:text-blue-600"
                        >
                          {review.productId?.name || 'Sản phẩm đã xóa'}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Rating value={review.rating} size="sm" />
                          {review.isVerifiedPurchase && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                              Đã mua hàng
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(review._id)}
                          className="p-2 text-gray-400 hover:text-red-500"
                          title="Xóa đánh giá"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    {review.title && (
                      <p className="font-medium mt-2">{review.title}</p>
                    )}
                    <p className="text-gray-600 mt-1">{review.content}</p>
                    <p className="text-gray-400 text-xs mt-2">
                      {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                      {review.isEdited && <span className="ml-2">(đã chỉnh sửa)</span>}
                    </p>
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

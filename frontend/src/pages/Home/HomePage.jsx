import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { useSelector } from 'react-redux';
import { selectUser, selectIsAuthenticated } from '../../store/slices/authSlice';
import Layout from '../../components/Layout/Layout';
import HorizontalProductSlider from '../../components/HorizontalProductSlider/HorizontalProductSlider';
import { productAPI } from '../../api/product.api';
import { promotionAPI } from '../../api/promotion.api';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [newProducts, setNewProducts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Bestsellers state ---
  const [bestsellers, setBestsellers] = useState([]);
  const [bestPage, setBestPage] = useState(1);
  const [bestTotalPages, setBestTotalPages] = useState(1);
  const [bestLoading, setBestLoading] = useState(false);

  // --- Most viewed state ---
  const [mostViewed, setMostViewed] = useState([]);
  const [viewedPage, setViewedPage] = useState(1);
  const [viewedTotalPages, setViewedTotalPages] = useState(1);
  const [viewedLoading, setViewedLoading] = useState(false);

  // Initial load (new products & promotions)
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoading(true);
        const [newData, promoData] = await Promise.all([
          productAPI.getNewProducts(8),
          promotionAPI.getFeatured(5),
        ]);
        setNewProducts(newData.data || []);
        setPromotions(promoData.data || []);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  // Fetch bestsellers (paginated)
  useEffect(() => {
    const fetchBestsellers = async () => {
      setBestLoading(true);
      try {
        const res = await productAPI.getBestsellers({ page: bestPage, limit: 10 });
        if (res.data) {
          setBestsellers(res.data.products || []);
          setBestTotalPages(res.data.pagination?.totalPages || 1);
        }
      } catch (error) {
        console.error('Error fetching bestsellers:', error);
      } finally {
        setBestLoading(false);
      }
    };
    fetchBestsellers();
  }, [bestPage]);

  // Fetch most viewed (paginated)
  useEffect(() => {
    const fetchMostViewed = async () => {
      setViewedLoading(true);
      try {
        const res = await productAPI.getMostViewed({ page: viewedPage, limit: 10 });
        if (res.data) {
          setMostViewed(res.data.products || []);
          setViewedTotalPages(res.data.pagination?.totalPages || 1);
        }
      } catch (error) {
        console.error('Error fetching most viewed:', error);
      } finally {
        setViewedLoading(false);
      }
    };
    fetchMostViewed();
  }, [viewedPage]);

  return (
    <Layout>
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <Swiper
          modules={[Navigation, Autoplay]}
          navigation
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          loop
          className="max-w-5xl mx-auto py-10"
        >
          {promotions.length > 0
            ? promotions.map((promo) => (
                <SwiperSlide key={promo._id}>
                  <div className="text-center px-8">
                    <span className="inline-block bg-red-500 text-white text-sm px-3 py-1 rounded-full mb-3">
                      Giảm {promo.discountPercent}%
                    </span>
                    <h1 className="text-2xl md:text-4xl font-bold mb-3">{promo.title}</h1>
                    <p className="text-blue-100 mb-4 max-w-xl mx-auto">{promo.description}</p>
                    <button
                      onClick={() => navigate('/products')}
                      className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
                    >
                      Xem ngay
                    </button>
                  </div>
                </SwiperSlide>
              ))
            : (
                <SwiperSlide>
                  <div className="text-center px-8">
                    <h1 className="text-2xl md:text-4xl font-bold mb-3">Chào mừng đến BookStore</h1>
                    <p className="text-blue-100 mb-4">Khám phá hàng ngàn cuốn sách hay</p>
                    <button
                      onClick={() => navigate('/products')}
                      className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50"
                    >
                      Khám phá ngay
                    </button>
                  </div>
                </SwiperSlide>
              )}
        </Swiper>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Greeting */}
        {isAuthenticated && (
          <div className="bg-blue-50 rounded-xl p-4 mb-8 flex items-center justify-between border border-blue-100">
            <div>
              <p className="text-gray-500 text-sm">Xin chào,</p>
              <p className="font-bold text-lg text-blue-600">{user?.username}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>📧 {user?.email}</p>
            </div>
          </div>
        )}

        {/* ── Sách mới nhất ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 bg-blue-600 rounded-full" />
              <h2 className="text-xl font-bold text-gray-800">✨ Sách mới nhất</h2>
            </div>
            <Link
              to="/products?isNew=true"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              Xem thêm <span>→</span>
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-72 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : newProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {newProducts.slice(0, 4).map((p) => (
                <Link
                  key={p._id}
                  to={`/product/${p.slug}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg overflow-hidden block transition-all duration-200 hover:-translate-y-1 group border border-gray-100"
                >
                  <div className="aspect-[3/4] bg-gray-50 overflow-hidden">
                    <img
                      src={p.coverImage || 'https://via.placeholder.com/300x400'}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    {p.category && <p className="text-xs text-blue-600 mb-1 font-medium">{p.category.name}</p>}
                    <h3 className="font-medium text-sm line-clamp-2 mb-1 text-gray-800">{p.name}</h3>
                    <p className="text-gray-500 text-xs mb-2">{p.author}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-blue-600 text-sm">{(p.salePrice || p.price)?.toLocaleString()}đ</p>
                      {p.salePrice && <p className="text-gray-400 text-xs line-through">{p.price?.toLocaleString()}đ</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic">Chưa có sách mới</p>
          )}
        </section>

        {/* ── Sách bán chạy nhất (10 sản phẩm + phân trang ngang) ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 bg-orange-500 rounded-full" />
              <h2 className="text-xl font-bold text-gray-800">🔥 10 Sách bán chạy nhất</h2>
              {!bestLoading && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                  Trang {bestPage}/{bestTotalPages}
                </span>
              )}
            </div>
            <Link
              to="/products?isBestseller=true"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              Xem thêm <span>→</span>
            </Link>
          </div>
          <HorizontalProductSlider
            products={bestsellers}
            loading={bestLoading}
            totalPages={bestTotalPages}
            currentPage={bestPage}
            onPageChange={setBestPage}
            badge="rank"
            badgeColor="bg-orange-500"
          />
        </section>

        {/* ── Sách xem nhiều nhất (10 sản phẩm + phân trang ngang) ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 bg-purple-500 rounded-full" />
              <h2 className="text-xl font-bold text-gray-800">👁️ 10 Sách xem nhiều nhất</h2>
              {!viewedLoading && (
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                  Trang {viewedPage}/{viewedTotalPages}
                </span>
              )}
            </div>
          </div>
          <HorizontalProductSlider
            products={mostViewed}
            loading={viewedLoading}
            totalPages={viewedTotalPages}
            currentPage={viewedPage}
            onPageChange={setViewedPage}
            badge="rank"
            badgeColor="bg-purple-500"
          />
        </section>

        {/* CTA */}
        <div className="text-center py-6">
          <button
            onClick={() => navigate('/products')}
            className="bg-blue-600 text-white px-10 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-blue-300/50"
          >
            📚 Xem tất cả sách →
          </button>
        </div>
      </div>
    </Layout>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse border border-gray-100">
      <div className="aspect-[3/4] bg-gradient-to-br from-gray-200 to-gray-300" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

/**
 * HorizontalProductSlider
 * Props:
 *   - products: array
 *   - loading: bool
 *   - totalPages: number
 *   - currentPage: number
 *   - onPageChange: fn(page)
 *   - badge: string | null (e.g. "🔥", "👁️")
 *   - badgeColor: tailwind class string
 */
export default function HorizontalProductSlider({
  products = [],
  loading = false,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  badge = null,
  badgeColor = 'bg-red-500',
}) {
  const [swiper, setSwiper] = useState(null);

  const handlePrevPage = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
      if (swiper) swiper.slideTo(0, 300);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
      if (swiper) swiper.slideTo(0, 300);
    }
  };

  const skeletonCount = 5;

  return (
    <div className="relative">
      {/* Swiper */}
      <div className="px-1 pb-10">
        <Swiper
          modules={[Navigation]}
          onSwiper={setSwiper}
          spaceBetween={16}
          slidesPerView={2}
          breakpoints={{
            480: { slidesPerView: 3 },
            768: { slidesPerView: 4 },
            1024: { slidesPerView: 5 },
          }}
          className="!overflow-visible"
        >
          {loading
            ? [...Array(skeletonCount)].map((_, i) => (
                <SwiperSlide key={`sk-${i}`}>
                  <ProductSkeleton />
                </SwiperSlide>
              ))
            : products.map((p, index) => (
                <SwiperSlide key={p._id}>
                  <Link
                    to={`/product/${p.slug}`}
                    className="bg-white rounded-xl shadow-sm hover:shadow-lg overflow-hidden block transition-all duration-200 hover:-translate-y-1 group border border-gray-100 relative"
                  >
                    <div className="aspect-[3/4] bg-gray-50 overflow-hidden relative">
                      <img
                        src={p.coverImage || 'https://via.placeholder.com/300x400'}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Rank badge */}
                      {badge && (
                        <div className={`absolute top-2 left-2 z-10 ${badgeColor} text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow`}>
                          {index + 1 + (currentPage - 1) * 10}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      {p.category && (
                        <p className="text-xs text-blue-600 mb-1 font-medium truncate">{p.category.name}</p>
                      )}
                      <h3 className="font-medium text-sm line-clamp-2 mb-1 text-gray-800">{p.name}</h3>
                      <p className="text-gray-500 text-xs mb-2 truncate">{p.author}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="font-bold text-blue-600 text-sm">
                          {(p.salePrice || p.price)?.toLocaleString()}đ
                        </p>
                        {p.salePrice && (
                          <p className="text-gray-400 text-xs line-through">{p.price?.toLocaleString()}đ</p>
                        )}
                      </div>
                      {p.soldQuantity > 0 && (
                        <p className="text-xs text-orange-500 mt-1 font-medium">🔥 {p.soldQuantity.toLocaleString()} đã bán</p>
                      )}
                      {p.viewCount > 0 && (
                        <p className="text-xs text-purple-500 mt-1 font-medium">👁️ {p.viewCount.toLocaleString()} lượt xem</p>
                      )}
                    </div>
                  </Link>
                </SwiperSlide>
              ))}
        </Swiper>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || loading}
            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Trang trước
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => {
                  if (onPageChange) onPageChange(p);
                  if (swiper) swiper.slideTo(0, 300);
                }}
                disabled={loading}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                  p === currentPage
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || loading}
            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Trang sau →
          </button>
        </div>
      )}
    </div>
  );
}

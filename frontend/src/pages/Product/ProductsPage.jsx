import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import { productAPI } from '../../api/product.api';
import { categoryAPI } from '../../api/category.api';

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
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

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryAPI.getAll();
        setCategories(response.data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Reset when filters change
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasNextPage(false);
    setInitialLoading(true);
  }, [searchParams.toString()]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      if (page === 1) {
        setInitialLoading(true);
      } else {
        setIsFetchingMore(true);
      }
      setLoading(true);

      try {
        const params = { page, limit: 12, sortBy };
        if (search) params.search = search;
        if (category) params.category = category;
        if (searchParams.get('isNew') === 'true') params.isNew = 'true';
        if (searchParams.get('isBestseller') === 'true') params.isBestseller = 'true';

        const response = await productAPI.getProducts(params);

        if (response.data) {
          const newProducts = response.data.products || [];
          const pag = response.data.pagination || {};
          setTotal(pag.total || 0);
          setTotalPages(pag.totalPages || 1);
          setHasNextPage(pag.hasNextPage || false);

          if (page === 1) {
            setProducts(newProducts);
          } else {
            setProducts((prev) => {
              const existingIds = new Set(prev.map((p) => p._id));
              const unique = newProducts.filter((p) => !existingIds.has(p._id));
              return [...prev, ...unique];
            });
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
        setInitialLoading(false);
        setIsFetchingMore(false);
      }
    };

    fetchProducts();
  }, [page, searchParams.toString()]);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasNextPage && !loading) {
        setPage((prev) => prev + 1);
      }
    },
    [hasNextPage, loading]
  );

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [handleObserver]);

  const handleFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const getTitle = () => {
    if (search) return `Kết quả tìm kiếm: "${search}"`;
    if (searchParams.get('isNew') === 'true') return '✨ Sách mới nhất';
    if (searchParams.get('isBestseller') === 'true') return '🔥 Sách bán chạy';
    if (category) {
      const cat = categories.find((c) => c.slug === category);
      return cat ? `📚 ${cat.name}` : '📚 Tất cả sách';
    }
    return '📚 Tất cả sách';
  };

  const hasFilters = category || search || searchParams.get('isNew') || searchParams.get('isBestseller');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{getTitle()}</h1>
          {!initialLoading && (
            <p className="text-sm text-gray-500 mt-1">
              Hiển thị <span className="font-semibold text-blue-600">{products.length}</span>
              {total > products.length ? ` / ${total.toLocaleString()}` : ''} sản phẩm
            </p>
          )}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">📂 Danh mục:</label>
              <select
                value={category}
                onChange={(e) => handleFilter('category', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Tất cả</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">↕️ Sắp xếp:</label>
              <select
                value={sortBy}
                onChange={(e) => handleFilter('sortBy', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="createdAt">Mới nhất</option>
                <option value="price">Giá thấp → cao</option>
                <option value="price-desc">Giá cao → thấp</option>
                <option value="soldQuantity">Bán chạy nhất</option>
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={() => setSearchParams({})}
                className="ml-auto text-sm text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
              >
                ✕ Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {initialLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 text-lg mb-4">Không tìm thấy sản phẩm nào</p>
            <button
              onClick={() => setSearchParams({})}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Xem tất cả sách
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((p) => (
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
                    {p.category && (
                      <p className="text-xs text-blue-600 mb-1 font-medium">{p.category.name}</p>
                    )}
                    <h3 className="font-medium text-sm line-clamp-2 mb-1 text-gray-800">{p.name}</h3>
                    <p className="text-gray-500 text-xs mb-2">{p.author}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-blue-600 text-sm">
                        {(p.salePrice || p.price)?.toLocaleString()}đ
                      </p>
                      {p.salePrice && (
                        <p className="text-gray-400 text-xs line-through">{p.price?.toLocaleString()}đ</p>
                      )}
                    </div>
                    {p.soldQuantity > 0 && (
                      <p className="text-xs text-gray-400 mt-1">Đã bán: {p.soldQuantity}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Sentinel cho Infinite Scroll */}
            <div ref={sentinelRef} className="py-4 flex justify-center">
              {isFetchingMore && (
                <div className="flex items-center gap-3 text-gray-500 text-sm">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Đang tải thêm sản phẩm...
                </div>
              )}
              {!hasNextPage && products.length > 0 && !loading && (
                <p className="text-gray-400 text-sm py-2">✅ Đã hiển thị tất cả {total.toLocaleString()} sản phẩm</p>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

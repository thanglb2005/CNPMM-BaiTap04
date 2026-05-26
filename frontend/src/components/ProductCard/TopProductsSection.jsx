import { useEffect, useState, useCallback } from 'react';
import { productAPI } from '../../api/product.api';
import HorizontalCarousel from '../ProductCard/HorizontalCarousel';

export default function TopProductsSection() {
  const [topSelling, setTopSelling] = useState([]);
  const [topViewed, setTopViewed] = useState([]);
  const [sellingPage, setSellingPage] = useState(1);
  const [viewedPage, setViewedPage] = useState(1);
  const [loadingSelling, setLoadingSelling] = useState(true);
  const [loadingViewed, setLoadingViewed] = useState(true);

  const ITEMS_PER_PAGE = 5;

  // Tải top 10 sản phẩm bán chạy nhất một lần
  const fetchTopSelling = useCallback(async () => {
    try {
      setLoadingSelling(true);
      const response = await productAPI.getTopSellingProducts(1, 10);
      if (response.data) {
        setTopSelling(response.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching top selling:', error);
    } finally {
      setLoadingSelling(false);
    }
  }, []);

  // Tải top 10 sản phẩm xem nhiều nhất một lần
  const fetchTopViewed = useCallback(async () => {
    try {
      setLoadingViewed(true);
      const response = await productAPI.getTopViewedProducts(1, 10);
      if (response.data) {
        setTopViewed(response.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching top viewed:', error);
    } finally {
      setLoadingViewed(false);
    }
  }, []);

  useEffect(() => {
    fetchTopSelling();
    fetchTopViewed();
  }, [fetchTopSelling, fetchTopViewed]);

  const handleSellingPageChange = (newPage) => {
    setSellingPage(newPage);
  };

  const handleViewedPageChange = (newPage) => {
    setViewedPage(newPage);
  };

  return (
    <div>
      {/* 1. Top sản phẩm bán chạy nhất - Phân trang theo chiều ngang (5 sản phẩm/trang) */}
      <HorizontalCarousel
        products={topSelling}
        title="Top Sách Bán Chạy Nhất"
        icon="🔥"
        loading={loadingSelling}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={topSelling.length}
        currentPage={sellingPage}
        onPageChange={handleSellingPageChange}
        linkTo="/products?sort=soldQuantity"
        linkText="Xem tất cả"
      />

      {/* 2. Top sản phẩm xem nhiều nhất - Phân trang theo chiều ngang (5 sản phẩm/trang) */}
      <HorizontalCarousel
        products={topViewed}
        title="Top Sách Xem Nhiều Nhất"
        icon="👁"
        loading={loadingViewed}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={topViewed.length}
        currentPage={viewedPage}
        onPageChange={handleViewedPageChange}
        linkTo="/products"
        linkText="Khám phá thêm"
      />
    </div>
  );
}

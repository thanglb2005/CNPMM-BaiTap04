import apiClient from './axiosClient';

export const productAPI = {
  getProducts: (params) => apiClient.get('/products', { params }),
  getNewProducts: (limit = 8) => apiClient.get('/products/new', { params: { limit } }),
  getBestsellers: (params = {}) => apiClient.get('/products/bestsellers', { params: { limit: 10, ...params } }),
  getMostViewed: (params = {}) => apiClient.get('/products/most-viewed', { params: { limit: 10, ...params } }),
  getFeaturedProducts: (limit = 8) => apiClient.get('/products/featured', { params: { limit } }),
  getProductBySlug: (slug) => apiClient.get(`/products/${slug}`),
  getRelatedProducts: (id, limit = 6) => apiClient.get(`/products/related/${id}`, { params: { limit } }),
};

import axiosClient from './axiosClient';

export const recentlyViewedAPI = {
  // Get recently viewed products
  getRecentlyViewed: (params) =>
    axiosClient.get('/recently-viewed', { params }),

  // Add product to recently viewed
  addToRecentlyViewed: (productId) =>
    axiosClient.post(`/recently-viewed/${productId}`),

  // Remove from recently viewed
  removeFromRecentlyViewed: (productId) =>
    axiosClient.delete(`/recently-viewed/${productId}`),

  // Clear all recently viewed
  clearRecentlyViewed: () =>
    axiosClient.delete('/recently-viewed'),
};

export const productStatsAPI = {
  // Get product stats (buyer count, reviewer count)
  getProductStats: (productId) =>
    axiosClient.get(`/products/stats/${productId}`),

  // Get similar products
  getSimilarProducts: (productId, params) =>
    axiosClient.get(`/products/similar/${productId}`, { params }),
};

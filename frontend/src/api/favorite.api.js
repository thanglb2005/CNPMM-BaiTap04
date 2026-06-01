import axiosClient from './axiosClient';

export const favoriteAPI = {
  // Get user's favorites
  getMyFavorites: (params) =>
    axiosClient.get('/favorites', { params }),

  // Get favorites count
  getFavoritesCount: () =>
    axiosClient.get('/favorites/count'),

  // Check if product is favorited
  checkFavorite: (productId) =>
    axiosClient.get(`/favorites/check/${productId}`),

  // Check multiple products at once
  checkMultipleFavorites: (productIds) =>
    axiosClient.post('/favorites/bulk-check', { productIds }),

  // Toggle favorite (add/remove)
  toggleFavorite: (productId) =>
    axiosClient.post(`/favorites/toggle/${productId}`),

  // Remove from favorites
  removeFavorite: (productId) =>
    axiosClient.delete(`/favorites/${productId}`),

  // Clear all favorites
  clearAllFavorites: () =>
    axiosClient.delete('/favorites'),
};

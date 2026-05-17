import apiClient from './axiosClient';

export const promotionAPI = {
  getActive: () => apiClient.get('/promotions'),
  getFeatured: (limit = 5) => apiClient.get('/promotions/featured', { params: { limit } }),
  getBySlug: (slug) => apiClient.get(`/promotions/${slug}`),
};

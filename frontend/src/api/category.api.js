import apiClient from './axiosClient';

export const categoryAPI = {
  getAll: () => apiClient.get('/categories'),
  getFeatured: () => apiClient.get('/categories/featured'),
  getBySlug: (slug) => apiClient.get(`/categories/${slug}`),
};

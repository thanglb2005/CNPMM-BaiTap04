import apiClient from './axiosClient';

export const newsAPI = {
  getNews: (params) => apiClient.get('/news', { params }),
  getFeatured: (limit = 5) => apiClient.get('/news/featured', { params: { limit } }),
  getLatest: (limit = 5) => apiClient.get('/news/latest', { params: { limit } }),
  getBySlug: (slug) => apiClient.get(`/news/${slug}`),
};

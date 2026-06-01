import axiosClient from './axiosClient';

export const reviewAPI = {
  // Get reviews for a product
  getProductReviews: (productId, params) =>
    axiosClient.get(`/reviews/product/${productId}`, { params }),

  // Get current user's reviews
  getMyReviews: (params) =>
    axiosClient.get('/reviews/user', { params }),

  // Get single review
  getReviewById: (reviewId) =>
    axiosClient.get(`/reviews/${reviewId}`),

  // Check if user can review a product
  canReview: (productId) =>
    axiosClient.get(`/reviews/can-review/${productId}`),

  // Create a review
  createReview: (data) =>
    axiosClient.post('/reviews', data),

  // Update a review
  updateReview: (reviewId, data) =>
    axiosClient.put(`/reviews/${reviewId}`, data),

  // Delete a review
  deleteReview: (reviewId) =>
    axiosClient.delete(`/reviews/${reviewId}`),
};

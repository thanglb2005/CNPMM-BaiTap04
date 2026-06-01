import axiosClient from './axiosClient';

export const couponAPI = {
  // Get available public coupons
  getPublicCoupons: () =>
    axiosClient.get('/coupons'),

  // Get coupon by code
  getCouponByCode: (code) =>
    axiosClient.get(`/coupons/${code}`),

  // Get user's coupons
  getMyCoupons: (status = 'available') =>
    axiosClient.get('/coupons/my/list', { params: { status } }),

  // Apply coupon to order
  applyCoupon: (data) =>
    axiosClient.post('/coupons/apply', data),

  // Claim a public coupon
  claimCoupon: (couponId) =>
    axiosClient.post(`/coupons/claim/${couponId}`),
};

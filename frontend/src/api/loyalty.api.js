import axiosClient from './axiosClient';

export const loyaltyAPI = {
  // Get current points balance
  getMyPoints: () =>
    axiosClient.get('/loyalty/points'),

  // Get points history
  getPointsHistory: (params) =>
    axiosClient.get('/loyalty/history', { params }),

  // Get available rewards
  getAvailableRewards: () =>
    axiosClient.get('/loyalty/rewards'),

  // Redeem points for custom amount
  redeemPoints: (data) =>
    axiosClient.post('/loyalty/redeem', data),

  // Redeem for free shipping
  redeemFreeShipping: () =>
    axiosClient.post('/loyalty/redeem-free-shipping'),

  // Redeem specific reward
  redeemReward: (rewardId) =>
    axiosClient.post('/loyalty/redeem-reward', { rewardId }),
};

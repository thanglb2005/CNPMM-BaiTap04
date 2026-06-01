const express = require('express');
const router = express.Router();
const loyaltyController = require('./loyalty.controller');
const { authenticate } = require('../../middleware/auth.middleware');

module.exports = (app) => {
  app.use('/api/loyalty', router);

  // All routes require authentication
  router.get('/points', authenticate, loyaltyController.getMyPoints);
  router.get('/history', authenticate, loyaltyController.getPointsHistory);
  router.get('/rewards', authenticate, loyaltyController.getAvailableRewards);

  router.post('/redeem', authenticate, loyaltyController.redeemPoints);
  router.post('/redeem-free-shipping', authenticate, loyaltyController.redeemFreeShipping);
  router.post('/redeem-reward', authenticate, loyaltyController.redeemReward);
};

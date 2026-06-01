const express = require('express');
const router = express.Router();
const recentlyViewedController = require('./recentlyViewed.controller');
const { authenticate } = require('../../middleware/auth.middleware');

module.exports = (app) => {
  app.use('/api/recently-viewed', router);

  // All routes require authentication
  router.get('/', authenticate, recentlyViewedController.getRecentlyViewed);
  router.post('/:productId', authenticate, recentlyViewedController.addToRecentlyViewed);
  router.delete('/:productId', authenticate, recentlyViewedController.removeFromRecentlyViewed);
  router.delete('/', authenticate, recentlyViewedController.clearRecentlyViewed);

  // Product stats (public)
  app.use('/api/products', router);
  router.get('/stats/:productId', recentlyViewedController.getProductStats);
  router.get('/similar/:productId', recentlyViewedController.getSimilarProducts);
};

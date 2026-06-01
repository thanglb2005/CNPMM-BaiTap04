const express = require('express');
const router = express.Router();
const favoriteController = require('./favorite.controller');
const { authenticate } = require('../../middleware/auth.middleware');

module.exports = (app) => {
  app.use('/api/favorites', router);

  // All routes require authentication
  router.get('/', authenticate, favoriteController.getMyFavorites);
  router.get('/count', authenticate, favoriteController.getFavoritesCount);
  router.get('/check/:productId', authenticate, favoriteController.checkFavorite);
  router.post('/bulk-check', authenticate, favoriteController.checkMultipleFavorites);
  router.post('/toggle/:productId', authenticate, favoriteController.toggleFavorite);
  router.delete('/:productId', authenticate, favoriteController.removeFavorite);
  router.delete('/', authenticate, favoriteController.clearAllFavorites);
};

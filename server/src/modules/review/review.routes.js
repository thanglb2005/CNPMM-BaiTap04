const express = require('express');
const router = express.Router();
const reviewController = require('./review.controller');
const { authenticate } = require('../../middleware/auth.middleware');

module.exports = (app) => {
  app.use('/api/reviews', router);

  // Public routes (but need auth for protected actions)
  router.get('/product/:productId', reviewController.getProductReviews);

  // User routes (need auth)
  router.get('/user', authenticate, reviewController.getMyReviews);
  router.get('/can-review/:productId', authenticate, reviewController.canReview);
  router.get('/:id', reviewController.getReviewById);
  router.post('/', authenticate, reviewController.createReview);
  router.put('/:id', authenticate, reviewController.updateReview);
  router.delete('/:id', authenticate, reviewController.deleteReview);
};

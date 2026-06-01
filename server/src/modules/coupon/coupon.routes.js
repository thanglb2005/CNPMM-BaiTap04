const express = require('express');
const router = express.Router();
const couponController = require('./coupon.controller');
const { authenticate, requireAdmin } = require('../../middleware/auth.middleware');

module.exports = (app) => {
  app.use('/api/coupons', router);

  // Public routes
  router.get('/', couponController.getPublicCoupons);
  router.get('/:code', couponController.getCouponByCode);

  // Protected routes
  router.get('/my/list', authenticate, couponController.getMyCoupons);
  router.post('/apply', authenticate, couponController.applyCoupon);
  router.post('/claim/:couponId', authenticate, couponController.claimCoupon);

  // Admin routes
  router.get('/admin/all', authenticate, requireAdmin, couponController.getAllCoupons);
  router.post('/admin', authenticate, requireAdmin, couponController.createCoupon);
  router.put('/admin/:id', authenticate, requireAdmin, couponController.updateCoupon);
  router.delete('/admin/:id', authenticate, requireAdmin, couponController.deleteCoupon);
};

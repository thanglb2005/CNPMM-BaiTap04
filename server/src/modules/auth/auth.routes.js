const express = require('express');
const router  = express.Router();

const {
  register,
  verifyEmailOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPasswordWithOtp,
} = require('./auth.controller');
const { validate }    = require('../../middleware/validation.middleware');
const { checkAuth } = require('../../middleware/auth.middleware');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyEmailOtpSchema,
  resetPasswordOtpSchema,
} = require('./auth.validation');

router.post('/register', validate(registerSchema), register);
router.post('/verify-email-otp', validate(verifyEmailOtpSchema), verifyEmailOtp);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/logout', checkAuth, logout);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password-otp', validate(resetPasswordOtpSchema), resetPasswordWithOtp);

module.exports = router;

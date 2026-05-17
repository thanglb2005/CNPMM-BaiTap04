const rateLimit = require('express-rate-limit');
const { HttpResponse } = require('../shared/utils/apiResponse');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      HttpResponse.error(
        'Too many login attempts. Please try again after 15 minutes.',
        'RATE_LIMIT_EXCEEDED'
      )
    );
  },
});

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      HttpResponse.error('Too many requests. Please slow down.', 'RATE_LIMIT_EXCEEDED')
    );
  },
});

module.exports = { authRateLimiter, globalRateLimiter };

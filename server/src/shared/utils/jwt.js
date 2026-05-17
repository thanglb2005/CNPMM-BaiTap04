const jwt = require('jsonwebtoken');

const createAccessToken = (user) =>
  jwt.sign(
    { sub: user._id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );

const createRefreshToken = (user) =>
  jwt.sign(
    { sub: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

const validateAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET);

const validateRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

module.exports = {
  createAccessToken,
  createRefreshToken,
  validateAccessToken,
  validateRefreshToken,
};

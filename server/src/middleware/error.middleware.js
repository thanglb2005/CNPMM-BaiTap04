const { HttpResponse } = require('../shared/utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  console.error(`[Error] ${statusCode} — ${err.message}`);
  if (isDev && err.stack) console.error(err.stack);

  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json(HttpResponse.error('Dữ liệu không hợp lệ', 'VALIDATION_ERROR', details));
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json(HttpResponse.error(`${field} đã tồn tại`, 'DUPLICATE_KEY'));
  }

  if (err.name === 'CastError') {
    return res.status(400).json(HttpResponse.error('ID không hợp lệ', 'INVALID_ID'));
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(HttpResponse.error('Token không hợp lệ', 'INVALID_TOKEN'));
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(HttpResponse.error('Token đã hết hạn', 'TOKEN_EXPIRED'));
  }

  if (err.isOperational) {
    return res.status(statusCode).json(HttpResponse.error(err.message, `HTTP_${statusCode}`));
  }

  const message = isDev ? err.message : 'Đã có lỗi xảy ra';
  return res.status(500).json(HttpResponse.error(message, 'INTERNAL_ERROR'));
};

module.exports = { errorHandler };

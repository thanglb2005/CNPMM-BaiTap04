const { validateAccessToken } = require('../shared/utils/jwt');
const { AppException } = require('../shared/errors/AppError');
const User = require('../modules/user/user.model');

const checkAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return next(new AppException('Không tìm thấy token xác thực', 401));
    }

    const decoded = validateAccessToken(token);
    const user = await User.findById(decoded.sub).select('-password');

    if (!user) {
      return next(new AppException('Tài khoản không còn tồn tại', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppException('Bạn không có quyền thực hiện hành động này', 403));
  }
  next();
};

module.exports = { checkAuth, requireRole };

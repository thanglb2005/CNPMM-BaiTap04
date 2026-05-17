const authService = require('./auth.service');
const { HttpResponse } = require('../../shared/utils/apiResponse');
const { AppException } = require('../../shared/errors/AppError');

function attachTokens(res, { accessToken, refreshToken }) {
  const isProd  = process.env.NODE_ENV === 'production';
  const sameSite = isProd ? 'none' : 'lax';
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure:   isProd,
    sameSite,
    maxAge:   15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   isProd,
    sameSite,
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
}

const register = async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(HttpResponse.success(result, 'OTP đã gửi. Vui lòng xác minh email để kích hoạt tài khoản.'));
};

const verifyEmailOtp = async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyEmailOtp(email, otp);
  attachTokens(res, result);
  const { accessToken, refreshToken, ...rest } = result;
  res.status(200).json(HttpResponse.success(rest, result.message));
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  attachTokens(res, result);
  const { accessToken, refreshToken, ...rest } = result;
  res.status(200).json(HttpResponse.success(rest, 'Đăng nhập thành công'));
};

const refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppException('Không tìm thấy refresh token', 401);
  const result = await authService.refreshToken(token);
  attachTokens(res, result);
  res.status(200).json(HttpResponse.success(null, 'Token đã được làm mới'));
};

const logout = async (req, res) => {
  await authService.logout(req.user._id);
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.status(200).json(HttpResponse.success(null, 'Đăng xuất thành công'));
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.status(200).json(HttpResponse.success(null, result.message));
};

const resetPasswordWithOtp = async (req, res) => {
  const result = await authService.resetPasswordWithOtp(req.body);
  res.status(200).json(HttpResponse.success(null, result.message));
};

module.exports = {
  register,
  verifyEmailOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPasswordWithOtp,
};

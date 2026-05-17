const crypto = require('crypto');
const User = require('../user/user.model');
const redis = require('../../config/redis');
const { createAccessToken, createRefreshToken, validateRefreshToken } = require('../../shared/utils/jwt');
const { AppException } = require('../../shared/errors/AppError');
const messageBus = require('../../shared/events/eventBus');

const REFRESH_KEY          = (userId) => `refresh:${userId}`;
const EMAIL_VERIFY_OTP_KEY = (email)  => `otp:verify:${email.toLowerCase()}`;
const RESET_OTP_KEY        = (email)  => `otp:reset:${email.toLowerCase()}`;
const OTP_TTL_SECONDS = 10 * 60;

const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

class AuthService {
  async register({ email, username, password }) {
    const normalizedEmail = email.toLowerCase();

    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
    if (existing) {
      if (existing.email === normalizedEmail && !existing.isVerified) {
        const otp = createOtp();
        await redis.set(
          EMAIL_VERIFY_OTP_KEY(normalizedEmail),
          JSON.stringify({ otpHash: hashOtp(otp), userId: existing._id.toString() }),
          'EX',
          OTP_TTL_SECONDS
        );
        messageBus.emit('user:registered', {
          userId:   existing._id,
          email:    existing.email,
          username: existing.username,
          otp,
        });
        return { email: existing.email, requiresEmailVerification: true };
      }
      const field = existing.email === normalizedEmail ? 'Email' : 'Username';
      throw new AppException(`${field} already in use`, 409);
    }

    const user = await User.create({ email: normalizedEmail, username, password });
    const otp = createOtp();

    await redis.set(
      EMAIL_VERIFY_OTP_KEY(normalizedEmail),
      JSON.stringify({ otpHash: hashOtp(otp), userId: user._id.toString() }),
      'EX',
      OTP_TTL_SECONDS
    );

    messageBus.emit('user:registered', { userId: user._id, email: normalizedEmail, username, otp });

    return { email: normalizedEmail, requiresEmailVerification: true };
  }

  async verifyEmailOtp(email, otp) {
    const normalizedEmail = email.toLowerCase();
    const key  = EMAIL_VERIFY_OTP_KEY(normalizedEmail);
    const data = await redis.get(key);
    if (!data) throw new AppException('OTP không hợp lệ hoặc đã hết hạn', 400);

    const parsed = JSON.parse(data);
    if (parsed.otpHash !== hashOtp(otp)) {
      throw new AppException('OTP không hợp lệ hoặc đã hết hạn', 400);
    }

    const user = await User.findById(parsed.userId);
    if (!user) throw new AppException('Không tìm thấy tài khoản', 404);

    user.isVerified = true;
    await user.save({ validateBeforeSave: false });
    await redis.del(key);

    const accessToken  = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    await redis.set(REFRESH_KEY(user._id), refreshToken, 'EX', 7 * 24 * 60 * 60);

    return {
      user: user.toPublicProfile(),
      accessToken,
      refreshToken,
      message: 'Email đã xác minh thành công',
    };
  }

  async login(email, password) {
    const user = await User.findByEmail(email);
    if (!user) throw new AppException('Email hoặc mật khẩu không đúng', 401);

    const isMatch = await user.checkPassword(password);
    if (!isMatch) throw new AppException('Email hoặc mật khẩu không đúng', 401);

    if (!user.isVerified) {
      throw new AppException('Email chưa được xác minh. Vui lòng xác minh OTP trước khi đăng nhập.', 403);
    }

    const accessToken  = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    await redis.set(REFRESH_KEY(user._id), refreshToken, 'EX', 7 * 24 * 60 * 60);

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    return { user: user.toPublicProfile(), accessToken, refreshToken };
  }

  async refreshToken(token) {
    let decoded;
    try {
      decoded = validateRefreshToken(token);
    } catch {
      throw new AppException('Refresh token không hợp lệ hoặc đã hết hạn', 401);
    }

    const userId = decoded.sub;
    const stored = await redis.get(REFRESH_KEY(userId));
    if (!stored || stored !== token) {
      throw new AppException('Refresh token đã bị thu hồi hoặc hết hạn. Vui lòng đăng nhập lại.', 401);
    }

    const user = await User.findById(userId);
    if (!user) throw new AppException('Không tìm thấy tài khoản', 401);

    const newAccessToken  = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);

    await redis.set(REFRESH_KEY(userId), newRefreshToken, 'EX', 7 * 24 * 60 * 60);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId) {
    await redis.del(REFRESH_KEY(userId));
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) return { message: 'Nếu email tồn tại, OTP đặt lại mật khẩu đã được gửi.' };

    const otp = createOtp();
    await redis.set(
      RESET_OTP_KEY(email),
      JSON.stringify({ otpHash: hashOtp(otp), userId: user._id.toString() }),
      'EX',
      OTP_TTL_SECONDS
    );

    messageBus.emit('user:passwordResetOtp', {
      email,
      username: user.username,
      otp,
    });

    console.log(`🔑 [Dev] Reset OTP for ${email}: ${otp}`);

    return { message: 'Nếu email tồn tại, OTP đặt lại mật khẩu đã được gửi.' };
  }

  async resetPasswordWithOtp({ email, otp, newPassword }) {
    const key  = RESET_OTP_KEY(email);
    const data = await redis.get(key);
    if (!data) throw new AppException('OTP không hợp lệ hoặc đã hết hạn', 400);

    const parsed = JSON.parse(data);
    if (parsed.otpHash !== hashOtp(otp)) {
      throw new AppException('OTP không hợp lệ hoặc đã hết hạn', 400);
    }

    const user = await User.findById(parsed.userId).select('+password');
    if (!user) throw new AppException('Không tìm thấy tài khoản', 404);

    user.password = newPassword;
    await user.save();
    await redis.del(key);

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}

module.exports = new AuthService();

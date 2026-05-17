const User = require('./user.model');
const { AppException } = require('../../shared/errors/AppError');

class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppException('Không tìm thấy tài khoản', 404);
    return user.toPublicProfile();
  }

  async updateProfile(userId, { username, avatar }) {
    const user = await User.findById(userId);
    if (!user) throw new AppException('Không tìm thấy tài khoản', 404);

    if (username && username !== user.username) {
      const exists = await User.findOne({ username });
      if (exists) throw new AppException('Tên đăng nhập đã được sử dụng', 409);
      user.username = username;
    }
    if (avatar !== undefined) user.avatar = avatar;

    await user.save({ validateBeforeSave: false });
    return user.toPublicProfile();
  }

  async deleteAccount(userId) {
    await User.findByIdAndDelete(userId);
  }
}

module.exports = new UserService();

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  loginUser,
  registerUser,
  verifyEmailOtp,
  logoutUser,
  forgotPassword,
  resetPasswordOtp,
  loadUser,
  clearError,
  selectAuth,
} from '../store/slices/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, error, requiresEmailVerification } =
    useSelector(selectAuth);

  const loginAction = useCallback(
    async ({ email, password }) => {
      dispatch(clearError());
      const result = await dispatch(loginUser({ email, password }));
      if (loginUser.fulfilled.match(result)) {
        toast.success(`Chào mừng trở lại, ${result.payload?.username || 'bạn'}! 👋`);
        navigate('/home');
      } else {
        toast.error(result.payload || 'Đăng nhập thất bại');
      }
    },
    [dispatch, navigate]
  );

  const registerAction = useCallback(
    async ({ email, username, password }) => {
      dispatch(clearError());
      const result = await dispatch(registerUser({ email, username, password }));
      if (registerUser.fulfilled.match(result)) {
        toast.success('OTP đã gửi vào email. Vui lòng xác minh để kích hoạt tài khoản.');
        return { requiresEmailVerification: true };
      } else {
        toast.error(result.payload || 'Đăng ký thất bại');
        return null;
      }
    },
    [dispatch]
  );

  const verifyOtpAction = useCallback(
    async ({ email, otp }) => {
      dispatch(clearError());
      const result = await dispatch(verifyEmailOtp({ email, otp }));
      if (verifyEmailOtp.fulfilled.match(result)) {
        toast.success('Email đã xác minh! Tài khoản đã được kích hoạt.');
        navigate('/home');
        return true;
      } else {
        toast.error(result.payload || 'Xác minh OTP thất bại');
        return false;
      }
    },
    [dispatch, navigate]
  );

  const logoutAction = useCallback(async () => {
    await dispatch(logoutUser());
    toast.success('Đã đăng xuất');
    navigate('/login');
  }, [dispatch, navigate]);

  const forgotPasswordAction = useCallback(
    async ({ email }) => {
      dispatch(clearError());
      const result = await dispatch(forgotPassword({ email }));
      if (forgotPassword.fulfilled.match(result)) {
        toast.success('OTP đã gửi! Kiểm tra email của bạn 📧');
        return true;
      } else {
        toast.error(result.payload || 'Không thể gửi OTP');
        return false;
      }
    },
    [dispatch]
  );

  const resetPasswordAction = useCallback(
    async ({ email, otp, newPassword }) => {
      dispatch(clearError());
      const result = await dispatch(resetPasswordOtp({ email, otp, newPassword }));
      if (resetPasswordOtp.fulfilled.match(result)) {
        toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
        navigate('/login');
        return true;
      } else {
        toast.error(result.payload || 'Đặt lại mật khẩu thất bại');
        return false;
      }
    },
    [dispatch, navigate]
  );

  const loadCurrentUser = useCallback(() => dispatch(loadUser()), [dispatch]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    requiresEmailVerification,
    login: loginAction,
    register: registerAction,
    verifyEmailOtp: verifyOtpAction,
    logout: logoutAction,
    forgotPassword: forgotPasswordAction,
    resetPasswordOtp: resetPasswordAction,
    loadUser: loadCurrentUser,
    clearError: () => dispatch(clearError()),
  };
}

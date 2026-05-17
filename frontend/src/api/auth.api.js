import apiClient from './axiosClient';

export const authAPI = {
  login: (data) => apiClient.post('/auth/login', data),
  register: (data) => apiClient.post('/auth/register', data),
  verifyEmailOtp: (data) => apiClient.post('/auth/verify-email-otp', data),
  logout: () => apiClient.post('/auth/logout'),
  forgotPassword: (data) => apiClient.post('/auth/forgot-password', data),
  resetPasswordOtp: (data) => apiClient.post('/auth/reset-password-otp', data),
  refresh: () => apiClient.post('/auth/refresh'),
  getMe: () => apiClient.get('/users/me'),
};

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../api/auth.api';

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authAPI.getMe();
      return res.data ?? res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load user');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await authAPI.login({ email, password });
      const payload = res?.data ?? res;
      return payload?.user ?? payload;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error?.message || 'Đăng nhập thất bại'
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ email, username, password }, { rejectWithValue }) => {
    try {
      const res = await authAPI.register({ email, username, password });
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error?.message || 'Đăng ký thất bại'
      );
    }
  }
);

export const verifyEmailOtp = createAsyncThunk(
  'auth/verifyEmailOtp',
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const res = await authAPI.verifyEmailOtp({ email, otp });
      const payload = res?.data ?? res;
      return payload?.user ?? payload;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error?.message || 'Xác minh OTP thất bại'
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      await authAPI.forgotPassword({ email });
      return true;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error?.message || 'Không thể gửi OTP đặt lại mật khẩu'
      );
    }
  }
);

export const resetPasswordOtp = createAsyncThunk(
  'auth/resetPasswordOtp',
  async ({ email, otp, newPassword }, { rejectWithValue }) => {
    try {
      await authAPI.resetPasswordOtp({ email, otp, newPassword });
      return true;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error?.message || 'Đặt lại mật khẩu thất bại'
      );
    }
  }
);

const initialState = {
  user:                     null,
  isAuthenticated:          false,
  loading:                  false,
  error:                    null,
  requiresEmailVerification: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError:  (state)         => { state.error = null; },
    resetAuth:   ()              => initialState,
    setUser:     (state, action) => {
      state.user            = action.payload;
      state.isAuthenticated = true;
      state.loading         = false;
      state.error           = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.pending,   (state)          => { state.loading = true; state.error = null; })
      .addCase(loadUser.fulfilled, (state, action)  => {
        state.user = action.payload; state.isAuthenticated = true; state.loading = false;
      })
      .addCase(loadUser.rejected,  (state)          => {
        state.user = null; state.isAuthenticated = false; state.loading = false;
      });

    builder
      .addCase(loginUser.pending,   (state)         => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload; state.isAuthenticated = true;
        state.loading = false; state.error = null;
      })
      .addCase(loginUser.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload;
      });

    builder
      .addCase(registerUser.pending,   (state)         => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state)         => {
        state.loading = false; state.requiresEmailVerification = true;
      })
      .addCase(registerUser.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload;
      });

    builder
      .addCase(verifyEmailOtp.pending,   (state)         => { state.loading = true; state.error = null; })
      .addCase(verifyEmailOtp.fulfilled, (state, action) => {
        state.user = action.payload; state.isAuthenticated = true;
        state.loading = false; state.error = null; state.requiresEmailVerification = false;
      })
      .addCase(verifyEmailOtp.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload;
      });

    builder
      .addCase(logoutUser.pending,   (state) => { state.loading = true; })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null; state.isAuthenticated = false;
        state.loading = false; state.error = null; state.requiresEmailVerification = false;
      })
      .addCase(logoutUser.rejected,  (state) => {
        state.user = null; state.isAuthenticated = false; state.loading = false; state.error = null;
      });

    builder
      .addCase(forgotPassword.pending,   (state)         => { state.loading = true; state.error = null; })
      .addCase(forgotPassword.fulfilled, (state)         => { state.loading = false; })
      .addCase(forgotPassword.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload;
      });

    builder
      .addCase(resetPasswordOtp.pending,   (state)         => { state.loading = true; state.error = null; })
      .addCase(resetPasswordOtp.fulfilled, (state)         => { state.loading = false; })
      .addCase(resetPasswordOtp.rejected,  (state, action) => {
        state.loading = false; state.error = action.payload;
      });
  },
});

export const { clearError, resetAuth, setUser } = authSlice.actions;

export const selectAuth                       = (state) => state.auth;
export const selectUser                       = (state) => state.auth.user;
export const selectIsAuthenticated            = (state) => state.auth.isAuthenticated;
export const selectAuthLoading                = (state) => state.auth.loading;
export const selectAuthError                  = (state) => state.auth.error;
export const selectRequiresEmailVerification  = (state) => state.auth.requiresEmailVerification;

export default authSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { couponAPI } from '../../api/coupon.api';

const initialState = {
  publicCoupons: [],
  myCoupons: [],
  appliedCoupon: null,
  loading: false,
  error: null,
};

export const fetchPublicCoupons = createAsyncThunk(
  'coupon/fetchPublicCoupons',
  async (_, { rejectWithValue }) => {
    try {
      const response = await couponAPI.getPublicCoupons();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi lấy phiếu giảm giá');
    }
  }
);

export const fetchMyCoupons = createAsyncThunk(
  'coupon/fetchMyCoupons',
  async (status = 'available', { rejectWithValue }) => {
    try {
      const response = await couponAPI.getMyCoupons(status);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi lấy phiếu giảm giá của bạn');
    }
  }
);

export const applyCoupon = createAsyncThunk(
  'coupon/applyCoupon',
  async ({ code, orderAmount, productIds = [] }, { rejectWithValue }) => {
    try {
      const response = await couponAPI.applyCoupon({ code, orderAmount, productIds });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi áp dụng mã giảm giá');
    }
  }
);

export const claimCoupon = createAsyncThunk(
  'coupon/claimCoupon',
  async (couponId, { rejectWithValue }) => {
    try {
      const response = await couponAPI.claimCoupon(couponId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi nhận phiếu giảm giá');
    }
  }
);

const couponSlice = createSlice({
  name: 'coupon',
  initialState,
  reducers: {
    clearCouponError: (state) => {
      state.error = null;
    },
    clearAppliedCoupon: (state) => {
      state.appliedCoupon = null;
    },
    resetCouponState: (state) => {
      state.publicCoupons = [];
      state.myCoupons = [];
      state.appliedCoupon = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch public coupons
      .addCase(fetchPublicCoupons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.publicCoupons = action.payload;
      })
      .addCase(fetchPublicCoupons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch my coupons
      .addCase(fetchMyCoupons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.myCoupons = action.payload;
      })
      .addCase(fetchMyCoupons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Apply coupon
      .addCase(applyCoupon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(applyCoupon.fulfilled, (state, action) => {
        state.loading = false;
        state.appliedCoupon = action.payload;
      })
      .addCase(applyCoupon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Claim coupon
      .addCase(claimCoupon.fulfilled, (state, action) => {
        state.myCoupons.push(action.payload);
      });
  },
});

export const { clearCouponError, clearAppliedCoupon, resetCouponState } = couponSlice.actions;
export default couponSlice.reducer;

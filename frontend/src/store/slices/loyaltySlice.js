import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loyaltyAPI } from '../../api/loyalty.api';

const initialState = {
  points: null,
  history: [],
  availableRewards: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  loading: false,
  error: null,
};

export const fetchMyPoints = createAsyncThunk(
  'loyalty/fetchMyPoints',
  async (_, { rejectWithValue }) => {
    try {
      const response = await loyaltyAPI.getMyPoints();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi lấy điểm tích lũy');
    }
  }
);

export const fetchPointsHistory = createAsyncThunk(
  'loyalty/fetchPointsHistory',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await loyaltyAPI.getPointsHistory(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi lấy lịch sử điểm');
    }
  }
);

export const fetchAvailableRewards = createAsyncThunk(
  'loyalty/fetchAvailableRewards',
  async (_, { rejectWithValue }) => {
    try {
      const response = await loyaltyAPI.getAvailableRewards();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi lấy phần thưởng');
    }
  }
);

export const redeemPoints = createAsyncThunk(
  'loyalty/redeemPoints',
  async (data, { rejectWithValue }) => {
    try {
      const response = await loyaltyAPI.redeemPoints(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi đổi điểm');
    }
  }
);

export const redeemReward = createAsyncThunk(
  'loyalty/redeemReward',
  async (rewardId, { rejectWithValue }) => {
    try {
      const response = await loyaltyAPI.redeemReward(rewardId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi đổi phần thưởng');
    }
  }
);

export const redeemFreeShipping = createAsyncThunk(
  'loyalty/redeemFreeShipping',
  async (_, { rejectWithValue }) => {
    try {
      const response = await loyaltyAPI.redeemFreeShipping();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi đổi miễn phí vận chuyển');
    }
  }
);

const loyaltySlice = createSlice({
  name: 'loyalty',
  initialState,
  reducers: {
    clearLoyaltyError: (state) => {
      state.error = null;
    },
    resetLoyaltyState: (state) => {
      state.points = null;
      state.history = [];
      state.availableRewards = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch my points
      .addCase(fetchMyPoints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyPoints.fulfilled, (state, action) => {
        state.loading = false;
        state.points = action.payload;
      })
      .addCase(fetchMyPoints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch history
      .addCase(fetchPointsHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPointsHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload.history;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPointsHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch available rewards
      .addCase(fetchAvailableRewards.fulfilled, (state, action) => {
        state.availableRewards = action.payload.rewards;
      })
      // Redeem points
      .addCase(redeemPoints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(redeemPoints.fulfilled, (state, action) => {
        state.loading = false;
        if (state.points) {
          state.points.currentBalance = action.payload.newBalance;
        }
      })
      .addCase(redeemPoints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Redeem reward
      .addCase(redeemReward.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(redeemReward.fulfilled, (state, action) => {
        state.loading = false;
        if (state.points) {
          state.points.currentBalance = action.payload.newBalance;
        }
      })
      .addCase(redeemReward.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Redeem free shipping
      .addCase(redeemFreeShipping.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(redeemFreeShipping.fulfilled, (state, action) => {
        state.loading = false;
        if (state.points) {
          state.points.currentBalance = action.payload.newBalance;
        }
      })
      .addCase(redeemFreeShipping.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearLoyaltyError, resetLoyaltyState } = loyaltySlice.actions;
export default loyaltySlice.reducer;

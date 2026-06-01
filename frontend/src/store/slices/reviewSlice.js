import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reviewAPI } from '../../api/review.api';

const initialState = {
  reviews: [],
  myReviews: [],
  ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  currentReview: null,
  canReview: null,
  loading: false,
  error: null,
};

export const fetchProductReviews = createAsyncThunk(
  'review/fetchProductReviews',
  async ({ productId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await reviewAPI.getProductReviews(productId, params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi lấy đánh giá');
    }
  }
);

export const fetchMyReviews = createAsyncThunk(
  'review/fetchMyReviews',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await reviewAPI.getMyReviews(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi lấy đánh giá của bạn');
    }
  }
);

export const checkCanReview = createAsyncThunk(
  'review/checkCanReview',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await reviewAPI.canReview(productId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi kiểm tra quyền đánh giá');
    }
  }
);

export const createReview = createAsyncThunk(
  'review/createReview',
  async (data, { rejectWithValue }) => {
    try {
      const response = await reviewAPI.createReview(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi tạo đánh giá');
    }
  }
);

export const updateReview = createAsyncThunk(
  'review/updateReview',
  async ({ reviewId, data }, { rejectWithValue }) => {
    try {
      const response = await reviewAPI.updateReview(reviewId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi cập nhật đánh giá');
    }
  }
);

export const deleteReview = createAsyncThunk(
  'review/deleteReview',
  async (reviewId, { rejectWithValue }) => {
    try {
      await reviewAPI.deleteReview(reviewId);
      return reviewId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi xóa đánh giá');
    }
  }
);

const reviewSlice = createSlice({
  name: 'review',
  initialState,
  reducers: {
    clearReviewError: (state) => {
      state.error = null;
    },
    resetReviewState: (state) => {
      state.reviews = [];
      state.pagination = { page: 1, limit: 10, total: 0, totalPages: 0 };
      state.currentReview = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch product reviews
      .addCase(fetchProductReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload.reviews;
        state.ratingDistribution = action.payload.ratingDistribution;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProductReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch my reviews
      .addCase(fetchMyReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.myReviews = action.payload.reviews;
      })
      .addCase(fetchMyReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Check can review
      .addCase(checkCanReview.fulfilled, (state, action) => {
        state.canReview = action.payload;
      })
      // Create review
      .addCase(createReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews.unshift(action.payload.review);
        state.myReviews.unshift(action.payload.review);
      })
      .addCase(createReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update review
      .addCase(updateReview.fulfilled, (state, action) => {
        const index = state.reviews.findIndex((r) => r._id === action.payload._id);
        if (index !== -1) state.reviews[index] = action.payload;
        const myIndex = state.myReviews.findIndex((r) => r._id === action.payload._id);
        if (myIndex !== -1) state.myReviews[myIndex] = action.payload;
      })
      // Delete review
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.reviews = state.reviews.filter((r) => r._id !== action.payload);
        state.myReviews = state.myReviews.filter((r) => r._id !== action.payload);
      });
  },
});

export const { clearReviewError, resetReviewState } = reviewSlice.actions;
export default reviewSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { favoriteAPI } from '../../api/favorite.api';

const initialState = {
  favorites: [],
  favoriteIds: {},
  count: 0,
  loading: false,
  error: null,
};

export const fetchMyFavorites = createAsyncThunk(
  'favorite/fetchMyFavorites',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await favoriteAPI.getMyFavorites(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi lấy danh sách yêu thích');
    }
  }
);

export const fetchFavoritesCount = createAsyncThunk(
  'favorite/fetchFavoritesCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await favoriteAPI.getFavoritesCount();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi lấy số yêu thích');
    }
  }
);

export const toggleFavorite = createAsyncThunk(
  'favorite/toggleFavorite',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await favoriteAPI.toggleFavorite(productId);
      return { productId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi cập nhật yêu thích');
    }
  }
);

export const checkFavorite = createAsyncThunk(
  'favorite/checkFavorite',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await favoriteAPI.checkFavorite(productId);
      return { productId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi kiểm tra yêu thích');
    }
  }
);

export const checkMultipleFavorites = createAsyncThunk(
  'favorite/checkMultipleFavorites',
  async (productIds, { rejectWithValue }) => {
    try {
      const response = await favoriteAPI.checkMultipleFavorites(productIds);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi kiểm tra yêu thích');
    }
  }
);

export const removeFavorite = createAsyncThunk(
  'favorite/removeFavorite',
  async (productId, { rejectWithValue }) => {
    try {
      await favoriteAPI.removeFavorite(productId);
      return productId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi xóa yêu thích');
    }
  }
);

export const clearAllFavorites = createAsyncThunk(
  'favorite/clearAllFavorites',
  async (_, { rejectWithValue }) => {
    try {
      await favoriteAPI.clearAllFavorites();
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Lỗi khi xóa tất cả yêu thích');
    }
  }
);

const favoriteSlice = createSlice({
  name: 'favorite',
  initialState,
  reducers: {
    clearFavoriteError: (state) => {
      state.error = null;
    },
    resetFavorites: (state) => {
      state.favorites = [];
      state.favoriteIds = {};
      state.count = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch my favorites
      .addCase(fetchMyFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.favorites = action.payload.products;
        state.count = action.payload.pagination.total;
        const ids = {};
        action.payload.products.forEach((p) => {
          ids[p._id] = true;
        });
        state.favoriteIds = { ...state.favoriteIds, ...ids };
      })
      .addCase(fetchMyFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch count
      .addCase(fetchFavoritesCount.fulfilled, (state, action) => {
        state.count = action.payload.count;
      })
      // Toggle favorite
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { productId, isFavorite } = action.payload;
        if (isFavorite) {
          state.favoriteIds[productId] = true;
          state.count += 1;
        } else {
          delete state.favoriteIds[productId];
          state.count = Math.max(0, state.count - 1);
          state.favorites = state.favorites.filter((p) => p._id !== productId);
        }
      })
      // Check single favorite
      .addCase(checkFavorite.fulfilled, (state, action) => {
        const { productId, isFavorite } = action.payload;
        if (isFavorite) {
          state.favoriteIds[productId] = true;
        }
      })
      // Check multiple favorites
      .addCase(checkMultipleFavorites.fulfilled, (state, action) => {
        action.payload.forEach((result) => {
          if (result.isFavorite) {
            state.favoriteIds[result.productId] = true;
          }
        });
      })
      // Remove favorite
      .addCase(removeFavorite.fulfilled, (state, action) => {
        delete state.favoriteIds[action.payload];
        state.count = Math.max(0, state.count - 1);
        state.favorites = state.favorites.filter((p) => p._id !== action.payload);
      })
      // Clear all
      .addCase(clearAllFavorites.fulfilled, (state) => {
        state.favorites = [];
        state.favoriteIds = {};
        state.count = 0;
      });
  },
});

export const { clearFavoriteError, resetFavorites } = favoriteSlice.actions;
export default favoriteSlice.reducer;

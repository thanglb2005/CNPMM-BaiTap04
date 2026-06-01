import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import orderReducer from './slices/orderSlice';
import reviewReducer from './slices/reviewSlice';
import favoriteReducer from './slices/favoriteSlice';
import couponReducer from './slices/couponSlice';
import loyaltyReducer from './slices/loyaltySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    order: orderReducer,
    review: reviewReducer,
    favorite: favoriteReducer,
    coupon: couponReducer,
    loyalty: loyaltyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export default store;

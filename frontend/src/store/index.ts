import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import authReducer from "@/features/auth/authSlice";
import uiReducer from "@/features/ui/uiSlice";
import swipeReducer from "@/features/swipe/swipeSlice";
import { apiSlice } from "@/store/apiSlice";
import { swipeApi } from "@/features/swipe/swipeApi";
import { favoritesApi } from "@/features/favorites/favoritesApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    swipe: swipeReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
    [swipeApi.reducerPath]: swipeApi.reducer,
    [favoritesApi.reducerPath]: favoritesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, swipeApi.middleware, favoritesApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

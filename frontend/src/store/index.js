import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import favouritesReducer from './favouritesSlice'
import restaurantReducer from './restaurantSlice'
import reviewReducer from './reviewSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    restaurant: restaurantReducer,
    review: reviewReducer,
    favourites: favouritesReducer,
  },
})

import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../store/authSlice'
import favouritesReducer from '../store/favouritesSlice'
import restaurantReducer from '../store/restaurantSlice'
import reviewReducer from '../store/reviewSlice'

export function createTestStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      restaurant: restaurantReducer,
      review: reviewReducer,
      favourites: favouritesReducer,
    },
    preloadedState,
  })
}

export function renderWithProviders(ui, { preloadedState, store = createTestStore(preloadedState), ...options } = {}) {
  function Wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...options }) }
}

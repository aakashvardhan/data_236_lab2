import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { addFavorite, getFavorites, removeFavorite } from '../services/api'

const initialState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchFavourites = createAsyncThunk(
  'favourites/fetchFavourites',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getFavorites()
      return res.data || []
    } catch {
      return rejectWithValue('Failed to fetch favourites')
    }
  }
)

export const addFavouriteAsync = createAsyncThunk(
  'favourites/addFavourite',
  async (restaurantId, { dispatch, rejectWithValue }) => {
    try {
      await addFavorite(restaurantId)
      await dispatch(fetchFavourites())
      return true
    } catch {
      return rejectWithValue('Failed to add favourite')
    }
  }
)

export const removeFavouriteAsync = createAsyncThunk(
  'favourites/removeFavourite',
  async (restaurantId, { dispatch, rejectWithValue }) => {
    try {
      await removeFavorite(restaurantId)
      await dispatch(fetchFavourites())
      return true
    } catch {
      return rejectWithValue('Failed to remove favourite')
    }
  }
)

const favouritesSlice = createSlice({
  name: 'favourites',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavourites.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchFavourites.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchFavourites.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Failed to fetch favourites'
      })
  },
})

export const selectFavourites = (state) => state.favourites.items
export const selectFavouritesStatus = (state) => state.favourites.status

export default favouritesSlice.reducer

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getRestaurant, getRestaurants } from '../services/api'

const initialState = {
  list: [],
  total: 0,
  page: 1,
  perPage: 12,
  totalPages: 1,
  selectedRestaurant: null,
  status: 'idle',
  detailsStatus: 'idle',
  error: null,
}

export const fetchRestaurants = createAsyncThunk(
  'restaurant/fetchRestaurants',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await getRestaurants(params)
      return {
        items: res.data.items || [],
        total: Number(res.data.total) || 0,
        page: Number(res.data.page) || params.page || 1,
        perPage: Number(res.data.per_page) || params.per_page || 12,
        totalPages: Number(res.data.total_pages) || 1,
      }
    } catch {
      return rejectWithValue('Failed to fetch restaurants')
    }
  }
)

export const fetchRestaurantById = createAsyncThunk(
  'restaurant/fetchRestaurantById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await getRestaurant(id)
      return res.data
    } catch {
      return rejectWithValue('Restaurant not found.')
    }
  }
)

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRestaurants.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchRestaurants.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.list = action.payload.items
        state.total = action.payload.total
        state.page = action.payload.page
        state.perPage = action.payload.perPage
        state.totalPages = action.payload.totalPages
      })
      .addCase(fetchRestaurants.rejected, (state, action) => {
        state.status = 'failed'
        state.list = []
        state.total = 0
        state.totalPages = 1
        state.error = action.payload || 'Failed to fetch restaurants'
      })
      .addCase(fetchRestaurantById.pending, (state) => {
        state.detailsStatus = 'loading'
        state.error = null
      })
      .addCase(fetchRestaurantById.fulfilled, (state, action) => {
        state.detailsStatus = 'succeeded'
        state.selectedRestaurant = action.payload
      })
      .addCase(fetchRestaurantById.rejected, (state, action) => {
        state.detailsStatus = 'failed'
        state.selectedRestaurant = null
        state.error = action.payload || 'Restaurant not found.'
      })
  },
})

export const selectRestaurants = (state) => state.restaurant.list
export const selectRestaurantsMeta = (state) => ({
  total: state.restaurant.total,
  page: state.restaurant.page,
  perPage: state.restaurant.perPage,
  totalPages: state.restaurant.totalPages,
})
export const selectRestaurantListStatus = (state) => state.restaurant.status
export const selectSelectedRestaurant = (state) => state.restaurant.selectedRestaurant
export const selectRestaurantDetailsStatus = (state) => state.restaurant.detailsStatus

export default restaurantSlice.reducer

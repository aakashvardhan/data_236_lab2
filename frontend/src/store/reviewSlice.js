import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { createReview, deleteReview, getReviews, updateReview } from '../services/api'

const initialState = {
  byRestaurant: {},
  statusByRestaurant: {},
  submitStatus: 'idle',
  error: null,
}

export const fetchReviewsByRestaurant = createAsyncThunk(
  'review/fetchReviewsByRestaurant',
  async (restaurantId, { rejectWithValue }) => {
    try {
      const res = await getReviews(restaurantId)
      return { restaurantId, reviews: res.data || [] }
    } catch {
      return rejectWithValue('Failed to fetch reviews')
    }
  }
)

export const createReviewAsync = createAsyncThunk(
  'review/createReview',
  async ({ restaurantId, payload }, { dispatch, rejectWithValue }) => {
    try {
      await createReview(restaurantId, payload)
      await dispatch(fetchReviewsByRestaurant(restaurantId))
      return true
    } catch {
      return rejectWithValue('Failed to submit review.')
    }
  }
)

export const updateReviewAsync = createAsyncThunk(
  'review/updateReview',
  async ({ restaurantId, reviewId, payload }, { dispatch, rejectWithValue }) => {
    try {
      await updateReview(reviewId, payload)
      await dispatch(fetchReviewsByRestaurant(restaurantId))
      return true
    } catch {
      return rejectWithValue('Failed to submit review.')
    }
  }
)

export const deleteReviewAsync = createAsyncThunk(
  'review/deleteReview',
  async ({ restaurantId, reviewId }, { dispatch, rejectWithValue }) => {
    try {
      await deleteReview(reviewId)
      await dispatch(fetchReviewsByRestaurant(restaurantId))
      return true
    } catch {
      return rejectWithValue('Failed to delete review.')
    }
  }
)

const reviewSlice = createSlice({
  name: 'review',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviewsByRestaurant.pending, (state, action) => {
        state.statusByRestaurant[action.meta.arg] = 'loading'
        state.error = null
      })
      .addCase(fetchReviewsByRestaurant.fulfilled, (state, action) => {
        state.statusByRestaurant[action.payload.restaurantId] = 'succeeded'
        state.byRestaurant[action.payload.restaurantId] = action.payload.reviews
      })
      .addCase(fetchReviewsByRestaurant.rejected, (state, action) => {
        state.statusByRestaurant[action.meta.arg] = 'failed'
        state.error = action.payload || 'Failed to fetch reviews'
      })
      .addCase(createReviewAsync.pending, (state) => {
        state.submitStatus = 'loading'
      })
      .addCase(createReviewAsync.fulfilled, (state) => {
        state.submitStatus = 'succeeded'
      })
      .addCase(createReviewAsync.rejected, (state, action) => {
        state.submitStatus = 'failed'
        state.error = action.payload || 'Failed to submit review.'
      })
      .addCase(updateReviewAsync.pending, (state) => {
        state.submitStatus = 'loading'
      })
      .addCase(updateReviewAsync.fulfilled, (state) => {
        state.submitStatus = 'succeeded'
      })
      .addCase(updateReviewAsync.rejected, (state, action) => {
        state.submitStatus = 'failed'
        state.error = action.payload || 'Failed to submit review.'
      })
      .addCase(deleteReviewAsync.pending, (state) => {
        state.submitStatus = 'loading'
      })
      .addCase(deleteReviewAsync.fulfilled, (state) => {
        state.submitStatus = 'succeeded'
      })
      .addCase(deleteReviewAsync.rejected, (state, action) => {
        state.submitStatus = 'failed'
        state.error = action.payload || 'Failed to delete review.'
      })
  },
})

export const selectReviewsByRestaurant = (restaurantId) => (state) =>
  state.review.byRestaurant[restaurantId] || []
export const selectReviewStatusByRestaurant = (restaurantId) => (state) =>
  state.review.statusByRestaurant[restaurantId] || 'idle'
export const selectReviewSubmitStatus = (state) => state.review.submitStatus

export default reviewSlice.reducer

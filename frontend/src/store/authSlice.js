import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getMe, login, logout } from '../services/api'

const initialToken = localStorage.getItem('token')
const initialUser = initialToken
  ? {
      id: localStorage.getItem('userId') || null,
      name: localStorage.getItem('userName') || null,
      role: localStorage.getItem('userRole') || null,
    }
  : null

const initialState = {
  token: initialToken,
  user: initialUser,
  status: 'idle',
  error: null,
}

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await login(credentials)
      const token = res.data.access_token
      localStorage.setItem('token', token)

      const userRes = await getMe()
      const user = userRes.data
      localStorage.setItem('userName', user.name)
      localStorage.setItem('userRole', user.role)
      localStorage.setItem('userId', String(user.id))

      return { token, user }
    } catch {
      return rejectWithValue('Invalid email or password. Please try again.')
    }
  }
)

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  try {
    await logout()
  } catch {
    // Swallow API logout errors and clear local state anyway.
  }
  localStorage.removeItem('token')
  localStorage.removeItem('userName')
  localStorage.removeItem('userRole')
  localStorage.removeItem('userId')
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.token = action.payload.token
        state.user = action.payload.user
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Login failed'
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.token = null
        state.user = null
        state.status = 'idle'
        state.error = null
      })
  },
})

export const selectAuth = (state) => state.auth
export const selectToken = (state) => state.auth.token
export const selectCurrentUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) =>
  Boolean(state.auth.token || localStorage.getItem('token'))

export const selectCurrentUserWithFallback = (state) =>
  state.auth.user || {
    id: localStorage.getItem('userId') || null,
    name: localStorage.getItem('userName') || null,
    role: localStorage.getItem('userRole') || null,
  }

export default authSlice.reducer

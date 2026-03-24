import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ExplorePage from './pages/ExplorePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import RestaurantDetailPage from './pages/RestaurantDetailPage'
import ProfilePage from './pages/ProfilePage'
import AddRestaurantPage from './pages/AddRestaurantPage'
import FavoritesPage from './pages/FavoritesPage'
import DashboardPage from './pages/DashboardPage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'
import OwnerRestaurantPage from './pages/OwnerRestaurantPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<ExplorePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/add-restaurant" element={<AddRestaurantPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
          <Route path="/owner/restaurant/:id" element={<OwnerRestaurantPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
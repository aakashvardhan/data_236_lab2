import { Link } from "react-router-dom";
import { isLoggedIn, clearToken } from "../services/auth";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #ddd" }}>
      <Link to="/login">Login</Link>
      <Link to="/signup">Signup</Link>
      <Link to="/dashboard">Dashboard</Link>

      <div style={{ marginLeft: "auto" }}>
        {loggedIn ? (
          <button onClick={handleLogout}>Logout</button>
        ) : (
          <span>Not logged in</span>
        )}
      </div>
    </div>
  );
}
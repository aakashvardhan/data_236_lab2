import { clearToken } from "../services/auth";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div>
      <h2>Dashboard Page (Protected)</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
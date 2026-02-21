import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { setToken } from "../services/auth";
import { loginUser } from "../services/authApi";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const msg = searchParams.get("msg");

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please enter email and password.");
      return;
    }

    if (!form.email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(form);

      // adjust token field if backend uses different key
      const token =
        data?.access_token || data?.token || data?.jwt || data?.accessToken;

      if (!token) {
        throw new Error("No token returned from server.");
      }

      setToken(token);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Login failed. Backend may not be running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 360 }}>
      <h2>Login</h2>

      {msg === "signup_success" && (
        <div style={{ color: "green", marginBottom: 10 }}>
          Account created! Please login.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />

        {error && <div style={{ color: "red" }}>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p style={{ marginTop: 10 }}>
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </div>
  );
}
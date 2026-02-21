import { api } from "./api";

// These are placeholders. We will change them to match your backend.
export async function signupUser({ name, email, password }) {
  const res = await api.post("/auth/signup", { name, email, password });
  return res.data;
}

export async function loginUser({ email, password }) {
  const res = await api.post("/auth/login", { email, password });
  return res.data; // should contain token
}
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gnosis_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Lazy import to avoid circular dependency between api.js and store.js
let _logout = null;
export function registerLogout(fn) {
  _logout = fn;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (_logout) _logout();
    }
    return Promise.reject(error);
  }
);

export default api;

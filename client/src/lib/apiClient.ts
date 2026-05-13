/**
 * apiClient.ts
 * Pre-configured Axios instance. All API calls go through this.
 * Attaches JWT from local storage on every request.
 * Handles 401 → redirect to /login automatically.
 */

import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

// ── Request interceptor — attach auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("br_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("br_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;

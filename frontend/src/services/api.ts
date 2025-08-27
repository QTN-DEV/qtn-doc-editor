import axios from "axios";

import { API_URL } from "@/config";

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // This is crucial for sending cookies with requests
  headers: {
    "Content-Type": "application/json",
  },
  // Ensure cookies are sent with every request
  xsrfCookieName: "session",
  xsrfHeaderName: "X-CSRF-TOKEN",
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;

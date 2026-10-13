import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send httpOnly cookies on every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization Bearer token from localStorage as fallback
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('skillproof_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthenticated 401 response and server unreachable messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error'
    ) {
      const unreachableMsg = 'Cannot reach the server. Please make sure the backend is running.';
      error.message = unreachableMsg;
      if (!error.response) {
        error.response = {
          data: {
            success: false,
            error: unreachableMsg,
            message: unreachableMsg,
          },
          status: 503,
          statusText: 'Service Unavailable',
          headers: {},
          config: error.config,
        };
      } else if (error.response.data) {
        error.response.data.error = unreachableMsg;
        error.response.data.message = unreachableMsg;
      }
    }

    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('skillproof_token');
        localStorage.removeItem('skillproof_user');
      }
    }
    return Promise.reject(error);
  }
);

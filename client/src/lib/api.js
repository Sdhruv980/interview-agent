import axios from 'axios';

const getBaseUrl = () => {
  if (typeof window !== 'undefined' && localStorage.getItem('API_URL')) {
    return localStorage.getItem('API_URL');
  }
  const envUrl = import.meta.env.VITE_API_URL;
  // If envUrl is the old generic domain or empty, use the correct live endpoint
  if (envUrl && !envUrl.includes('interview-agent-api.onrender.com/api')) {
    return envUrl;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://interview-agent-api-eu6a.onrender.com/api';
  }
  return 'http://localhost:5000/api';
};

const activeBaseUrl = getBaseUrl();
console.log('[Interview Agent] Active API Base URL:', activeBaseUrl);

const api = axios.create({
  baseURL: activeBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

// Dynamically attach baseURL from localStorage and attach JWT on every request
api.interceptors.request.use((config) => {
  const customUrl = localStorage.getItem('API_URL');
  if (customUrl) {
    config.baseURL = customUrl;
  }
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize error messages so callers always get err.message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;

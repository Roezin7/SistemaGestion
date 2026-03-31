import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const token = window.localStorage.getItem('token');
  if (!token) {
    return config;
  }

  const headers = config.headers ?? {};
  if (!headers.Authorization) {
    headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  return {
    ...config,
    headers,
  };
});

export default api;

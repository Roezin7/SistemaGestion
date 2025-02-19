// src/axiosInterceptor.js
import axios from 'axios';
import { API_URL } from './config';

axios.interceptors.request.use(
  (config) => {
    if (config.url && config.url.startsWith('/')) {
      config.url = `${API_URL}${config.url}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

import axios from 'axios';
import { API_URL } from './config';

axios.interceptors.request.use(
  (config) => {
    console.log("Antes de modificar la URL:", config.url); // 🔍 Debugging
    if (config.url && config.url.startsWith('/')) {
      config.url = `${API_URL}${config.url}`;
    }
    console.log("Después de modificar la URL:", config.url); // 🔍 Debugging
    return config;
  },
  (error) => Promise.reject(error)
);

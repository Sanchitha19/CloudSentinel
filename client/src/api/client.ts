import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api'
});

apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Pipeline Intercepted Error:', error?.response || error.message);
    return Promise.reject(error);
  }
);

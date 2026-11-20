import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
});

// Interceptor untuk menambahkan JWT token ke header jika ada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Sesi yang dicabut server (kata sandi diubah, akun dihapus): buang token lalu kembali ke halaman masuk
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && error.response.data?.code === 'SESSION_INVALID') {
    localStorage.removeItem('token');
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }
  return Promise.reject(error);
});

export default api;

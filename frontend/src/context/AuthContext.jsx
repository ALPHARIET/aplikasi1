import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Periksa apakah user sudah login (punya token) saat aplikasi dimuat
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/profile');
          setUser(response.data.user);
        } catch (error) {
          console.error('Invalid token', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkUserLoggedIn();
  }, []);

  // role: peran yang dipilih di halaman login; backend menolak (403) kalau tidak sama dengan peran akun
  const login = async (identifier, password, role) => {
    const response = await api.post('/auth/login', { identifier, password, role });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

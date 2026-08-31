import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return api.get('/auth/me');
      })
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', {
      email,
      password
    });

    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    await api.post('/auth/logout');

    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

// Add this
export function useAuth() {
  return useContext(AuthContext);
}
import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const AlertsContext = createContext(null);

export function AlertsProvider({ children }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/alerts');
      setCount(data.count);
    } catch { /* ignore transient poll failures */ }
  }, [user]);

  useEffect(() => {
    if (!user) { setCount(0); return; }
    refresh();
    const interval = setInterval(refresh, 30000); // still poll, for changes from elsewhere
    return () => clearInterval(interval);
  }, [user, refresh]);

  return <AlertsContext.Provider value={{ count, refresh }}>{children}</AlertsContext.Provider>;
}

export const useAlerts = () => useContext(AlertsContext);
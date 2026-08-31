import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/useAuth';

export default function Layout() {
  const { user, logout } = useAuth();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    let interval;
    async function poll() {
      try {
        const { data } = await api.get('/alerts');
        setAlertCount(data.count);
      } catch { /* ignore transient poll failures */ }
    }
    poll();
    interval = setInterval(poll, 30000); // 30s poll — no websocket needed for this scope
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <span className="nav-brand">Support queue</span>
        <NavLink to="/" end>Queue</NavLink>
        <NavLink to="/mine">My tickets</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/alerts">
          Alerts {alertCount > 0 && <span className="alert-badge">{alertCount}</span>}
        </NavLink>
        <div className="nav-user">
          <span>{user?.name} · {user?.role}</span>
          <button onClick={logout}>Sign out</button>
        </div>
      </nav>
      <main className="app-content"><Outlet /></main>
    </div>
  );
}
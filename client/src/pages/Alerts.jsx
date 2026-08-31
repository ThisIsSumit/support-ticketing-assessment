import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import SlaBadge from '../components/SlaBadge';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get('/alerts').then(({ data }) => { setAlerts(data.alerts); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  async function acknowledge(ticketId) {
    await api.post(`/alerts/${ticketId}/acknowledge`);
    load();
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1>SLA alerts</h1>
      {alerts.length === 0 ? (
        <p className="empty-row">No active alerts — everything's within its response target.</p>
      ) : (
        <ul className="alerts-list">
          {alerts.map(({ ticket, slaStatus }) => (
            <li key={ticket._id} className="alert-row">
              <Link to={`/tickets/${ticket._id}`}>{ticket.subject}</Link>
              <SlaBadge status={slaStatus} />
              <span className="alert-priority">{ticket.priority}</span>
              <button onClick={() => acknowledge(ticket._id)}>Acknowledge</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
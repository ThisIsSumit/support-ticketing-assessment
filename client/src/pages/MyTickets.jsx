import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyTickets, listUsers } from '../api/tickets';
import SlaBadge from '../components/SlaBadge';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listMyTickets(), listUsers()])
      .then(([t, u]) => { setTickets(t); setUsers(u); })
      .catch(() => setError('Could not load your tickets.'))
      .finally(() => setLoading(false));
  }, []);

  const agentById = Object.fromEntries(users.map((u) => [u._id, u.name]));

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="form-error">{error}</p>;

  return (
    <div>
      <h1>My tickets</h1>
      <p className="page-subtitle">Tickets where you're the assignee or a collaborator, across every status.</p>
      <table className="queue-table">
        <thead>
          <tr><th>Subject</th><th>Status</th><th>Priority</th><th>Assignee</th><th>SLA</th><th>Updated</th></tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t._id}>
              <td><Link to={`/tickets/${t._id}`}>{t.subject}</Link></td>
              <td>{t.status}</td>
              <td>{t.priority}</td>
              <td>{t.primaryAssigneeId ? (agentById[t.primaryAssigneeId] || '…') : 'Unassigned'}</td>
              <td><SlaBadge status={t.slaStatus} /></td>
              <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {tickets.length === 0 && (
            <tr><td colSpan={6} className="empty-row">You have no assigned or collaborating tickets.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
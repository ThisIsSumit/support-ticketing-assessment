import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listTickets, listUsers } from '../api/tickets';
import SlaBadge from '../components/SlaBadge';
import TicketFormModal from '../components/TicketFormModal';

const STATUSES = ['New', 'Open', 'Pending', 'Resolved', 'Closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['bug', 'billing', 'how_to', 'feature_request', 'other'];

export default function Queue() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    q: '', status: '', priority: '', category: '', assignee: '',
    sortBy: 'createdAt', sortDir: 'desc', page: 1, pageSize: 20,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    listTickets(params).then(({ tickets, total }) => {
      setTickets(tickets);
      setTotal(total);
      setLoading(false);
    });
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listUsers().then(setUsers); }, []);

  // Debounce text search so we're not hitting the server on every keystroke.
  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
  }, [filters.q]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(key, value) {
    setFilters((f) => ({ ...f, [key]: value, page: key === 'page' ? value : 1 }));
  }

  const agentById = Object.fromEntries(users.map((u) => [u._id, u.name]));
  const totalPages = Math.max(Math.ceil(total / filters.pageSize), 1);

  return (
    <div>
      <div className="queue-header">
        <h1>Queue</h1>
        <button onClick={() => setShowCreate(true)}>New ticket</button>
      </div>

      <div className="queue-filters">
        <input placeholder="Search subject or description…" value={filters.q}
          onChange={(e) => update('q', e.target.value)} />
        <select value={filters.status} onChange={(e) => update('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => update('priority', e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filters.category} onChange={(e) => update('category', e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.assignee} onChange={(e) => update('assignee', e.target.value)}>
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {users.filter((u) => u.role === 'agent').map((u) => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>
        <select value={filters.sortBy} onChange={(e) => update('sortBy', e.target.value)}>
          <option value="createdAt">Created date</option>
          <option value="updatedAt">Last update</option>
          <option value="priority">Priority</option>
        </select>
        <button onClick={() => update('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')}>
          {filters.sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {loading ? <p>Loading…</p> : (
        <>
          <table className="queue-table">
            <thead>
              <tr>
                <th>Subject</th><th>Status</th><th>Priority</th><th>Category</th>
                <th>Assignee</th><th>SLA</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t._id}>
                  <td><Link to={`/tickets/${t._id}`}>{t.subject}</Link></td>
                  <td>{t.status}</td>
                  <td>{t.priority}</td>
                  <td>{t.category}</td>
                  <td>{t.primaryAssigneeId ? (agentById[t.primaryAssigneeId] || '…') : 'Unassigned'}</td>
                  <td><SlaBadge status={t.slaStatus} /></td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={7} className="empty-row">No tickets match these filters.</td></tr>
              )}
            </tbody>
          </table>

          <div className="pagination">
            <button disabled={filters.page <= 1} onClick={() => update('page', filters.page - 1)}>Prev</button>
            <span>Page {filters.page} of {totalPages} · {total} total</span>
            <button disabled={filters.page >= totalPages} onClick={() => update('page', filters.page + 1)}>Next</button>
          </div>
        </>
      )}

      {showCreate && (
        <TicketFormModal
          users={users.filter((u) => u.role === 'agent')}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}
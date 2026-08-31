import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listTickets, listUsers, bulkReassign, bulkClose, downloadExport, claimTicket } from '../api/tickets';
import SlaBadge from '../components/SlaBadge';
import TicketFormModal from '../components/TicketFormModal';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['New', 'Open', 'Pending', 'Resolved', 'Closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['bug', 'billing', 'how_to', 'feature_request', 'other'];

export default function Queue() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    q: '', status: '', priority: '', category: '', assignee: '',
    sortBy: 'createdAt', sortDir: 'desc', page: 1, pageSize: 20,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [bulkResults, setBulkResults] = useState(null);

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    return listTickets(params).then(({ tickets, total }) => {
      setTickets(tickets);
      setTotal(total);
      setLoading(false);
    });
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listUsers().then(setUsers); }, []);

  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  // Single definition. setLoading(true) lives here, in an event handler,
  // never inside an effect body — that's what the earlier React warning was about.
  function update(key, value) {
    setLoading(true);
    setFilters((f) => ({ ...f, [key]: value, page: key === 'page' ? value : 1 }));
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleBulkReassign() {
    const newAssigneeId = prompt('Reassign selected tickets to which agent ID?');
    if (!newAssigneeId) return;
    const { results } = await bulkReassign([...selected], newAssigneeId);
    setBulkResults(results);
    setSelected(new Set());
    load();
  }

  async function handleBulkClose() {
    const { results } = await bulkClose([...selected]);
    setBulkResults(results);
    setSelected(new Set());
    load();
  }

  async function handleClaim(ticketId) {
    try { await claimTicket(ticketId); load(); }
    catch (err) { alert(err.response?.data?.error || 'Could not claim ticket.'); }
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

      <div className="bulk-toolbar">
        <span>{selected.size} selected</span>
        {user.role === 'supervisor' && (
          <button disabled={selected.size === 0} onClick={handleBulkReassign}>Bulk reassign</button>
        )}
        <button disabled={selected.size === 0} onClick={handleBulkClose}>Bulk close</button>
        <button onClick={() => downloadExport(filters)}>Export CSV</button>
      </div>

      {bulkResults && (
        <div className="bulk-results">
          <h4>Bulk action results</h4>
          <ul>
            {bulkResults.map((r) => (
              <li key={r.ticketId} className={r.success ? 'result-ok' : 'result-fail'}>
                {r.ticketId}: {r.success ? 'Success' : `Failed — ${r.reason}`}
              </li>
            ))}
          </ul>
          <button onClick={() => setBulkResults(null)}>Dismiss</button>
        </div>
      )}

      {loading ? <p>Loading…</p> : (
        <>
          <table className="queue-table">
            <thead>
              <tr>
                <th></th>
                <th>Subject</th><th>Status</th><th>Priority</th><th>Category</th>
                <th>Assignee</th><th>SLA</th><th>Created</th><th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(t._id)}
                      onChange={() => toggleSelect(t._id)}
                    />
                  </td>
                  <td><Link to={`/tickets/${t._id}`}>{t.subject}</Link></td>
                  <td>{t.status}</td>
                  <td>{t.priority}</td>
                  <td>{t.category}</td>
                  <td>{t.primaryAssigneeId ? (agentById[t.primaryAssigneeId] || '…') : 'Unassigned'}</td>
                  <td><SlaBadge status={t.slaStatus} /></td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{!t.primaryAssigneeId && <button onClick={() => handleClaim(t._id)}>Claim</button>}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={9} className="empty-row">No tickets match these filters.</td></tr>
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
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTicket, reassignTicket, addReply, changeStatus,
  setCollaborators, archiveTicket, restoreTicket, listUsers,
} from '../api/tickets';
import { useAuth } from '../context/useAuth.js';
import { ALLOWED_TRANSITIONS } from '../constants/statusTransitions';
import SlaBadge from '../components/SlaBadge';
 import TicketEditForm from '../components/TicketEditForm';

export default  function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyType, setReplyType] = useState('to_customer'); // to_customer | log_customer_reply | internal_note
const [editing, setEditing] = useState(false);
  const load = useCallback(() => {
    getTicket(id).then(setData).catch(() => setError('Could not load this ticket.'));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listUsers().then(setUsers); }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { ticket, replies, events } = data;
  const agentById = Object.fromEntries(users.map((u) => [u._id, u.name]));
  const isSupervisor = user.role === 'supervisor';
  const isAssignee = ticket.primaryAssigneeId === user.id;
  const isCollaborator = ticket.collaboratorIds.includes(user.id);
  const canAct = isSupervisor || isAssignee || isCollaborator;

  async function handleStatusChange(newStatus) {
    setError(null);
    try { await changeStatus(id, newStatus); load(); }
    catch (err) { setError(err.response?.data?.error || 'Status change failed.'); }
  }

  async function handleReassign(e) {
    const newAssigneeId = e.target.value;
    if (!newAssigneeId) return;
    setError(null);
    try { await reassignTicket(id, newAssigneeId); load(); }
    catch (err) { setError(err.response?.data?.error || 'Reassign failed.'); }
  }

  async function handleReplySubmit(e) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    const isInternal = replyType === 'internal_note';
    const authorType = replyType === 'log_customer_reply' ? 'customer' : 'agent';
    setError(null);
    try {
      await addReply(id, replyBody, isInternal, authorType);
      setReplyBody('');
      load();
    } catch (err) { setError(err.response?.data?.error || 'Could not add reply.'); }
  }

  async function handleCollaboratorToggle(userId, checked) {
    const next = checked
      ? [...ticket.collaboratorIds, userId]
      : ticket.collaboratorIds.filter((cid) => cid !== userId);
    try { await setCollaborators(id, next); load(); }
    catch (err) { setError(err.response?.data?.error || 'Could not update collaborators.'); }
  }

  async function handleArchiveToggle() {
    try {
      if (ticket.archivedAt) await restoreTicket(id);
      else await archiveTicket(id);
      load();
    } catch (err) { setError(err.response?.data?.error || 'Could not archive/restore.'); }
  }

  // Merge replies + events into one chronological timeline for display.
  const timeline = [
    ...events.map((e) => ({ kind: 'event', ...e })),
    ...replies.map((r) => ({ kind: 'reply', ...r })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <div className="ticket-detail">
      <button className="back-link" onClick={() => navigate(-1)}>← Back to queue</button>

      <div className="ticket-header">
        <h1>{ticket.subject}</h1>
        <SlaBadge status={ticket.slaStatus} />
        {ticket.archivedAt && <span className="archived-tag">Archived</span>}
      </div>

      <div className="ticket-meta">
        <span>Status: <strong>{ticket.status}</strong></span>
        <span>Priority: {ticket.priority}</span>
        <span>Category: {ticket.category}</span>
        <span>Requester: {ticket.requesterEmail}</span>
        <span>Assignee: {ticket.primaryAssigneeId ? (agentById[ticket.primaryAssigneeId] || '…') : 'Unassigned'}</span>
      </div>

      {editing ? (
  <TicketEditForm
    ticket={ticket}
    onSaved={() => { setEditing(false); load(); }}
    onCancel={() => setEditing(false)}
  />
) : (
  <>
    <p className="ticket-description">{ticket.description}</p>
    {canAct && <button onClick={() => setEditing(true)}>Edit ticket</button>}
  </>
)}
      {error && <p className="form-error">{error}</p>}

      {canAct && (
        <div className="ticket-actions">
          <div className="status-buttons">
            {(ALLOWED_TRANSITIONS[ticket.status] || []).map((next) => (
              <button key={next} onClick={() => handleStatusChange(next)}>Move to {next}</button>
            ))}
          </div>

          {isSupervisor && (
            <select defaultValue="" onChange={handleReassign}>
              <option value="" disabled>Reassign to…</option>
              {users.filter((u) => u.role === 'agent').map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          )}

          <button onClick={handleArchiveToggle}>{ticket.archivedAt ? 'Restore' : 'Archive'}</button>
        </div>
      )}

      {isSupervisor || isAssignee ? (
        <div className="collaborators-section">
          <h3>Collaborators</h3>
          {users.filter((u) => u.role === 'agent' && u._id !== ticket.primaryAssigneeId).map((u) => (
            <label key={u._id} className="collaborator-checkbox">
              <input
                type="checkbox"
                checked={ticket.collaboratorIds.includes(u._id)}
                onChange={(e) => handleCollaboratorToggle(u._id, e.target.checked)}
              />
              {u.name}
            </label>
          ))}
        </div>
      ) : null}

      <h3>Timeline</h3>
      <ul className="timeline">
        {timeline.map((item) => (
          <li key={item._id} className={`timeline-item timeline-${item.kind}`}>
            <span className="timeline-time">{new Date(item.createdAt).toLocaleString()}</span>
            {item.kind === 'event' && (
              <span>
                {item.type === 'created' && `Ticket created (${item.toValue})`}
                {item.type === 'status_change' && `Status: ${item.fromValue} → ${item.toValue}`}
                {item.type === 'reassignment' && `Reassigned`}
                {item.type === 'reply' && `Reply added`}
              </span>
            )}
            {item.kind === 'reply' && (
              <span className={item.isInternal ? 'reply-internal' : 'reply-external'}>
                {item.isInternal ? '[Internal note] ' : item.authorType === 'customer' ? '[Customer said] ' : '[Reply to customer] '}
                {item.body}
              </span>
            )}
          </li>
        ))}
      </ul>

      {canAct && (
        <form className="reply-form" onSubmit={handleReplySubmit}>
          <h3>Add reply</h3>
          <select value={replyType} onChange={(e) => setReplyType(e.target.value)}>
            <option value="to_customer">Reply to customer</option>
            <option value="log_customer_reply">Log what the customer said</option>
            <option value="internal_note">Internal note (staff only)</option>
          </select>
          <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} required />
          <button type="submit">Add reply</button>
        </form>
      )}
    </div>
  );
}
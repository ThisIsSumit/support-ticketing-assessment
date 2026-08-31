import { useState } from 'react';
import { createTicket } from '../api/tickets';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['bug', 'billing', 'how_to', 'feature_request', 'other'];

export default function TicketFormModal({ users, onClose, onCreated }) {
  const [form, setForm] = useState({
    subject: '', description: '', requesterEmail: '', priority: 'medium',
    category: 'bug', primaryAssigneeId: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!payload.primaryAssigneeId) delete payload.primaryAssigneeId;
      await createTicket(payload);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>New ticket</h2>
        <label>Subject
          <input required value={form.subject} onChange={(e) => set('subject', e.target.value)} />
        </label>
        <label>Description
          <textarea required value={form.description} onChange={(e) => set('description', e.target.value)} />
        </label>
        <label>Requester email
          <input required type="email" value={form.requesterEmail} onChange={(e) => set('requesterEmail', e.target.value)} />
        </label>
        <label>Priority
          <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>Category
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Assign to (optional — leave blank to keep it in the shared queue as New)
          <select value={form.primaryAssigneeId} onChange={(e) => set('primaryAssigneeId', e.target.value)}>
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create ticket'}</button>
        </div>
      </form>
    </div>
  );
}
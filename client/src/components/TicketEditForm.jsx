import { useState } from 'react';
import { updateTicket } from '../api/tickets';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['bug', 'billing', 'how_to', 'feature_request', 'other'];

export default function TicketEditForm({ ticket, onSaved, onCancel }) {
  const [form, setForm] = useState({
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    category: ticket.category,
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateTicket(ticket._id, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ticket-edit-form" onSubmit={handleSubmit}>
      <label>Subject
        <input required value={form.subject} onChange={(e) => set('subject', e.target.value)} />
      </label>
      <label>Description
        <textarea required value={form.description} onChange={(e) => set('description', e.target.value)} />
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
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}
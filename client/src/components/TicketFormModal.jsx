import { useState } from 'react';
import { createTicket } from '../api/tickets';

// MUI
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['bug', 'billing', 'how_to', 'feature_request', 'other'];

export default function TicketFormModal({ users, onClose, onCreated }) {
  const [form, setForm] = useState({
    subject: '', description: '', requesterEmail: '', priority: 'medium',
    category: 'bug', primaryAssigneeId: '',
  });
  const [error, setError]         = useState(null);
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
    <Dialog open onClose={onClose}>
      <DialogTitle>New ticket</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} component="form" id="new-ticket-form" onSubmit={handleSubmit} noValidate>
          {error && <Alert severity="error" variant="outlined">{error}</Alert>}

          <TextField
            label="Subject"
            required
            fullWidth
            value={form.subject}
            onChange={(e) => set('subject', e.target.value)}
          />
          <TextField
            label="Description"
            required
            fullWidth
            multiline
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
          <TextField
            label="Requester email"
            required
            fullWidth
            type="email"
            value={form.requesterEmail}
            onChange={(e) => set('requesterEmail', e.target.value)}
          />

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select label="Priority" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Assign to (optional)</InputLabel>
            <Select
              label="Assign to (optional)"
              value={form.primaryAssigneeId}
              onChange={(e) => set('primaryAssigneeId', e.target.value)}
            >
              <MenuItem value="">Unassigned — leave in shared queue as New</MenuItem>
              {users.map((u) => <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          type="submit"
          form="new-ticket-form"
          variant="contained"
          disabled={submitting}
        >
          {submitting ? 'Creating…' : 'Create ticket'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
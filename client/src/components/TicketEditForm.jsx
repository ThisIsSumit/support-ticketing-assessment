import { useState } from 'react';
import { updateTicket } from '../api/tickets';

// MUI
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['bug', 'billing', 'how_to', 'feature_request', 'other'];

export default function TicketEditForm({ ticket, onSaved, onCancel }) {
  const [form, setForm] = useState({
    subject:     ticket.subject,
    description: ticket.description,
    priority:    ticket.priority,
    category:    ticket.category,
  });
  const [error, setSaveError] = useState(null);
  const [saving, setSaving]   = useState(false);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await updateTicket(ticket._id, form);
      onSaved();
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
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
          rows={4}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />

        <Stack direction="row" spacing={1.5}>
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
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
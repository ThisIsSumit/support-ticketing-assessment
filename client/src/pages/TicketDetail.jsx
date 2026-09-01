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

// MUI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import EditIcon from '@mui/icons-material/Edit';

const STATUS_COLOR   = { New: 'default', Open: 'primary', Pending: 'warning', Resolved: 'success', Closed: 'default' };
const PRIORITY_COLOR = { low: 'default', medium: 'info', high: 'warning', urgent: 'error' };

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]           = useState(null);
  const [users, setUsers]         = useState([]);
  const [error, setError]         = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyType, setReplyType] = useState('to_customer');
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);

  const load = useCallback(() => {
    getTicket(id).then(setData).catch((err) =>{
      setError(err.response.data.error);
      console.log(err.response.data);
    });

    
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listUsers().then(setUsers); }, []);

  if (error && !data) {
    return <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>{error}</Alert>;
  }
  if (!data) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} /></Box>;
  }

  const { ticket, replies, events } = data;
  const agentById    = Object.fromEntries(users.map((u) => [u._id, u.name]));
  const isSupervisor = user?.role === 'supervisor';
  const userId       = user?._id || user?.id;
  const isAssignee   = !!(userId && ticket.primaryAssigneeId === userId);
  const isCollaborator = !!(userId && ticket.collaboratorIds?.includes(userId));
  const canAct       = isSupervisor || isAssignee || isCollaborator;

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
    setSaving(true);
    try {
      await addReply(id, replyBody, isInternal, authorType);
      setReplyBody('');
      load();
    } catch (err) { setError(err.response?.data?.error || 'Could not add reply.'); }
    finally { setSaving(false); }
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

  // Merge replies + events into one chronological timeline
  const timeline = [
    ...events.map((e) => ({ kind: 'event', ...e })),
    ...replies.map((r) => ({ kind: 'reply', ...r })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <Box>
      {/* ── Back ── */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        size="small"
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        Back to queue
      </Button>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>{ticket.subject}</Typography>
        <SlaBadge status={ticket.slaStatus} />
        {ticket.archivedAt && <Chip label="Archived" size="small" variant="outlined" color="default" />}
      </Box>

      {/* ── Meta strip ── */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Chip label={`Status: ${ticket.status}`} color={STATUS_COLOR[ticket.status] ?? 'default'} variant={ticket.status === 'Closed' ? 'outlined' : 'filled'} />
        <Chip label={`Priority: ${ticket.priority}`} color={PRIORITY_COLOR[ticket.priority] ?? 'default'} />
        <Chip label={`Category: ${ticket.category?.replace(/_/g, ' ')}`} variant="outlined" />
        <Chip label={`Requester: ${ticket.requesterEmail}`} variant="outlined" />
        <Chip
          label={`Assignee: ${ticket.primaryAssigneeId ? (agentById[ticket.primaryAssigneeId] || '…') : 'Unassigned'}`}
          variant="outlined"
          color={ticket.primaryAssigneeId ? 'default' : 'warning'}
        />
      </Stack>

      {/* ── Description / Edit form ── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        {editing ? (
          <TicketEditForm
            ticket={ticket}
            onSaved={() => { setEditing(false); load(); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <Box>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {ticket.description}
            </Typography>
            {canAct && (
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => setEditing(true)}
                sx={{ mt: 1.5 }}
              >
                Edit ticket
              </Button>
            )}
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Actions ── */}
      {canAct && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Actions</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }} alignItems="center">
            {/* Status transitions */}
            {(ALLOWED_TRANSITIONS[ticket.status] || []).length > 0 && (
              <ButtonGroup size="small" variant="outlined">
                {(ALLOWED_TRANSITIONS[ticket.status] || []).map((next) => (
                  <Button key={next} onClick={() => handleStatusChange(next)}>
                    → {next}
                  </Button>
                ))}
              </ButtonGroup>
            )}

            {/* Reassign — supervisor only */}
            {isSupervisor && (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Reassign to…</InputLabel>
                <Select label="Reassign to…" defaultValue="" onChange={handleReassign}>
                  <MenuItem value="" disabled>Reassign to…</MenuItem>
                  {users.filter((u) => u.role === 'agent').map((u) => (
                    <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Archive / Restore */}
            <Button
              size="small"
              variant="outlined"
              color={ticket.archivedAt ? 'primary' : 'warning'}
              startIcon={ticket.archivedAt ? <UnarchiveIcon /> : <ArchiveIcon />}
              onClick={handleArchiveToggle}
            >
              {ticket.archivedAt ? 'Restore' : 'Archive'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* ── Collaborators ── */}
      {(isSupervisor || isAssignee) && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Collaborators</Typography>
          <FormGroup row>
            {users
              .filter((u) => u.role === 'agent' && u._id !== ticket.primaryAssigneeId)
              .map((u) => (
                <FormControlLabel
                  key={u._id}
                  control={
                    <Checkbox
                      size="small"
                      checked={ticket.collaboratorIds.includes(u._id)}
                      onChange={(e) => handleCollaboratorToggle(u._id, e.target.checked)}
                    />
                  }
                  label={<Typography variant="body2">{u.name}</Typography>}
                />
              ))}
          </FormGroup>
        </Paper>
      )}

      {/* ── Timeline ── */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Timeline</Typography>
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <List disablePadding>
          {timeline.map((item, idx) => {
            const isEvent = item.kind === 'event';
            const isInternal = !isEvent && item.isInternal;
            const isCustomer = !isEvent && item.authorType === 'customer';

            const bubbleBg = isEvent
              ? 'transparent'
              : isInternal
                ? '#fffbeb'  // amber-50
                : isCustomer
                  ? '#eff6ff'  // blue-50
                  : '#f0fdf4'; // green-50

            const borderLeft = isEvent
              ? 'none'
              : isInternal
                ? '3px solid #d97706'
                : isCustomer
                  ? '3px solid #3b82f6'
                  : '3px solid #16a34a';

            const label = isEvent
              ? null
              : isInternal
                ? 'Internal note'
                : isCustomer
                  ? 'Customer said'
                  : 'Reply to customer';

            return (
              <Box key={item._id}>
                {idx > 0 && <Divider />}
                <ListItem alignItems="flex-start" sx={{ py: 1.5, px: 2 }}>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      {label && (
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                          {label}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </Typography>
                    </Box>

                    {isEvent ? (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        {item.type === 'created' && `Ticket created (${item.toValue})`}
                        {item.type === 'status_change' && `Status: ${item.fromValue} → ${item.toValue}`}
                        {item.type === 'reassignment' && 'Reassigned'}
                        {item.type === 'reply' && 'Reply added'}
                      </Typography>
                    ) : (
                      <Box
                        sx={{
                          bgcolor: bubbleBg,
                          borderLeft,
                          borderRadius: 1,
                          px: 1.5,
                          py: 1,
                          mt: 0.5,
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {item.body}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </ListItem>
              </Box>
            );
          })}

          {timeline.length === 0 && (
            <ListItem>
              <Typography variant="body2" color="text.secondary">No activity yet.</Typography>
            </ListItem>
          )}
        </List>
      </Paper>

      {/* ── Reply form ── */}
      {canAct && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Add reply</Typography>
          <Box component="form" onSubmit={handleReplySubmit}>
            <Stack spacing={1.5}>
              <FormControl size="small" fullWidth>
                <InputLabel>Reply type</InputLabel>
                <Select label="Reply type" value={replyType} onChange={(e) => setReplyType(e.target.value)}>
                  <MenuItem value="to_customer">Reply to customer</MenuItem>
                  <MenuItem value="log_customer_reply">Log what the customer said</MenuItem>
                  <MenuItem value="internal_note">Internal note (staff only)</MenuItem>
                </Select>
              </FormControl>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="Write your reply…"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                required
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" disabled={saving || !replyBody.trim()}>
                  {saving ? 'Sending…' : 'Add reply'}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
import { useEffect, useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { listTickets, listUsers, bulkReassign, bulkClose, downloadExport, claimTicket } from '../api/tickets';
import SlaBadge from '../components/SlaBadge';
import TicketFormModal from '../components/TicketFormModal';
import { useAuth } from '../context/useAuth.js';

// MUI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const STATUSES    = ['New', 'Open', 'Pending', 'Resolved', 'Closed'];
const PRIORITIES  = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES  = ['bug', 'billing', 'how_to', 'feature_request', 'other'];

const STATUS_COLOR = {
  New: 'default', Open: 'primary', Pending: 'warning', Resolved: 'success', Closed: 'default',
};
const PRIORITY_COLOR = {
  low: 'default', medium: 'info', high: 'warning', urgent: 'error',
};

export default function Queue() {
  const { user } = useAuth();
  const [tickets, setTickets]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [users, setUsers]           = useState([]);
  const [filters, setFilters]       = useState({
    q: '', status: '', priority: '', category: '', assignee: '',
    sortBy: 'createdAt', sortDir: 'desc', page: 1, pageSize: 10,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(new Set());
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

  function toggleSelectAll() {
    if (selected.size === tickets.length && tickets.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tickets.map((t) => t._id)));
    }
  }

  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId]     = useState('');
  const [closeConfirmOpen, setCloseConfirmOpen]   = useState(false);
  const [bulkSubmitting, setBulkSubmitting]       = useState(false);

  function handleOpenBulkReassign() {
    setSelectedAgentId('');
    setReassignModalOpen(true);
  }

  async function confirmBulkReassign() {
    if (!selectedAgentId || selected.size === 0) return;
    setBulkSubmitting(true);
    try {
      const { results } = await bulkReassign([...selected], selectedAgentId);
      setBulkResults(results);
      setSelected(new Set());
      setReassignModalOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Bulk reassign failed.');
    } finally {
      setBulkSubmitting(false);
    }
  }

  function handleOpenBulkClose() {
    setCloseConfirmOpen(true);
  }

  async function confirmBulkClose() {
    if (selected.size === 0) return;
    setBulkSubmitting(true);
    try {
      const { results } = await bulkClose([...selected]);
      setBulkResults(results);
      setSelected(new Set());
      setCloseConfirmOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Bulk close failed.');
    } finally {
      setBulkSubmitting(false);
    }
  }

  async function handleClaim(ticketId) {
    try { await claimTicket(ticketId); load(); }
    catch (err) { alert(err.response?.data?.error || 'Could not claim ticket.'); }
  }

  const agentById  = Object.fromEntries(users.map((u) => [u._id, u.name]));
  const totalPages = Math.max(Math.ceil(total / filters.pageSize), 1);
  const allSelected = tickets.length > 0 && selected.size === tickets.length;
  const someSelected = selected.size > 0 && selected.size < tickets.length;

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Queue</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
          New ticket
        </Button>
      </Box>

      {/* ── Filters toolbar ── */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <TextField
            placeholder="Search subject or description…"
            value={filters.q}
            onChange={(e) => update('q', e.target.value)}
            sx={{ minWidth: 240 }}
          />

          <FormControl sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={filters.status} onChange={(e) => update('status', e.target.value)}>
              <MenuItem value="">All statuses</MenuItem>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 130 }}>
            <InputLabel>Priority</InputLabel>
            <Select label="Priority" value={filters.priority} onChange={(e) => update('priority', e.target.value)}>
              <MenuItem value="">All priorities</MenuItem>
              {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={filters.category} onChange={(e) => update('category', e.target.value)}>
              <MenuItem value="">All categories</MenuItem>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>Assignee</InputLabel>
            <Select label="Assignee" value={filters.assignee} onChange={(e) => update('assignee', e.target.value)}>
              <MenuItem value="">All assignees</MenuItem>
              <MenuItem value="unassigned">Unassigned</MenuItem>
              {users.filter((u) => u.role === 'agent').map((u) => (
                <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>Sort by</InputLabel>
            <Select label="Sort by" value={filters.sortBy} onChange={(e) => update('sortBy', e.target.value)}>
              <MenuItem value="createdAt">Created date</MenuItem>
              <MenuItem value="updatedAt">Last update</MenuItem>
              <MenuItem value="priority">Priority</MenuItem>
            </Select>
          </FormControl>

          <ToggleButtonGroup
            exclusive
            value={filters.sortDir}
            onChange={(_, v) => { if (v) update('sortDir', v); }}
            size="small"
            sx={{ alignSelf: 'center' }}
          >
            <ToggleButton value="asc" aria-label="ascending">
              <ArrowUpwardIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="desc" aria-label="descending">
              <ArrowDownwardIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* ── Bulk action toolbar ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, minHeight: 36 }}>
        {user.role === 'supervisor' && (
          <>
            <Typography variant="body2" color="text.secondary">
              {selected.size} selected
            </Typography>
            <Button
              size="small"
              variant="outlined"
              disabled={selected.size === 0}
              onClick={handleOpenBulkReassign}
            >
              Bulk reassign
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={selected.size === 0}
              onClick={handleOpenBulkClose}
            >
              Bulk close
            </Button>
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" variant="text" startIcon={<DownloadIcon />} onClick={() => downloadExport(filters)}>
          Export CSV
        </Button>
      </Box>

      {/* ── Bulk results ── */}
      {bulkResults && (
        <Alert
          severity={bulkResults.some((r) => !r.success) ? 'warning' : 'success'}
          variant="outlined"
          onClose={() => setBulkResults(null)}
          sx={{ mb: 1.5 }}
        >
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Bulk Action Processed ({bulkResults.filter((r) => r.success).length}/{bulkResults.length} successful)
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {bulkResults.map((r) => (
              <li key={r.ticketId}>
                <Typography
                  variant="caption"
                  color={r.success ? 'success.main' : 'error.main'}
                  fontWeight={500}
                >
                  {r.ticketId}: {r.success ? 'Success' : `Failed — ${r.reason}`}
                </Typography>
              </li>
            ))}
          </Box>
        </Alert>
      )}

      {/* ── Table ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {user.role === 'supervisor' && (
                    <TableCell padding="checkbox" sx={{ width: 40 }}>
                      <Checkbox
                        size="small"
                        indeterminate={someSelected}
                        checked={allSelected}
                        onChange={toggleSelectAll}
                      />
                    </TableCell>
                  )}
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell>SLA</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell sx={{ width: 80 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow
                    key={t._id}
                    hover
                    selected={selected.has(t._id)}
                    sx={{ '&.Mui-selected': { bgcolor: 'primary.50' } }}
                  >
                    {user.role === 'supervisor' && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selected.has(t._id)}
                          onChange={() => toggleSelect(t._id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Link component={RouterLink} to={`/tickets/${t._id}`} underline="hover" color="text.primary">
                        {t.subject}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.status}
                        color={STATUS_COLOR[t.status] ?? 'default'}
                        variant={t.status === 'Closed' ? 'outlined' : 'filled'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.priority}
                        color={PRIORITY_COLOR[t.priority] ?? 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {t.category?.replace(/_/g, ' ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {t.primaryAssigneeId ? (agentById[t.primaryAssigneeId] || '…') : (
                          <Typography component="span" variant="body2" color="text.secondary" fontStyle="italic">
                            Unassigned
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell><SlaBadge status={t.slaStatus} /></TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {!t.primaryAssigneeId && (
                        <Button size="small" variant="outlined" onClick={() => handleClaim(t._id)}>
                          Claim
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {tickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={user.role === 'supervisor' ? 9 : 8} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No tickets match these filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ── Enhanced Pagination with explicit Prev & Next buttons ── */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            {/* Rows per page */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Rows per page:
              </Typography>
              <Select
                size="small"
                value={filters.pageSize}
                onChange={(e) => update('pageSize', Number(e.target.value))}
                sx={{ height: 32, fontSize: '0.8125rem' }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </Box>

            {/* Page info & Prev / Next buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Page <strong>{filters.page}</strong> of <strong>{totalPages}</strong> ({total} total tickets)
              </Typography>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<NavigateBeforeIcon />}
                  disabled={filters.page <= 1 || loading}
                  onClick={() => update('page', filters.page - 1)}
                  sx={{ minWidth: 80 }}
                >
                  Prev
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<NavigateNextIcon />}
                  disabled={filters.page >= totalPages || loading}
                  onClick={() => update('page', filters.page + 1)}
                  sx={{ minWidth: 80 }}
                >
                  Next
                </Button>
              </Stack>
            </Box>
          </Box>
        </Paper>
      )}

      {showCreate && (
        <TicketFormModal
          users={users.filter((u) => u.role === 'agent')}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      {/* ── Bulk Reassign Dialog ── */}
      <Dialog
        open={reassignModalOpen}
        onClose={() => !bulkSubmitting && setReassignModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Bulk Reassign Tickets</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Reassign <strong>{selected.size}</strong> selected ticket(s) to an agent:
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="bulk-reassign-agent-label">Select Agent</InputLabel>
            <Select
              labelId="bulk-reassign-agent-label"
              label="Select Agent"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              <MenuItem value="" disabled>
                <em>Select an agent…</em>
              </MenuItem>
              {users
                .filter((u) => u.role === 'agent')
                .map((u) => (
                  <MenuItem key={u._id} value={u._id}>
                    {u.name} {u.email ? `(${u.email})` : ''}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setReassignModalOpen(false)} disabled={bulkSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!selectedAgentId || bulkSubmitting}
            onClick={confirmBulkReassign}
          >
            {bulkSubmitting ? 'Reassigning…' : `Reassign ${selected.size} Ticket(s)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Close Confirmation Dialog ── */}
      <Dialog
        open={closeConfirmOpen}
        onClose={() => !bulkSubmitting && setCloseConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>Bulk Close Tickets</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Are you sure you want to close <strong>{selected.size}</strong> selected ticket(s)? This will transition their status and resolve them.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setCloseConfirmOpen(false)} disabled={bulkSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={bulkSubmitting}
            onClick={confirmBulkClose}
          >
            {bulkSubmitting ? 'Closing…' : `Close ${selected.size} Ticket(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
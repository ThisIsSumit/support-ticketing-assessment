import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { listMyTickets, listUsers } from '../api/tickets';
import SlaBadge from '../components/SlaBadge';

// MUI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

const STATUS_COLOR   = { New: 'default', Open: 'primary', Pending: 'warning', Resolved: 'success', Closed: 'default' };
const PRIORITY_COLOR = { low: 'default', medium: 'info', high: 'warning', urgent: 'error' };

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    Promise.all([listMyTickets(), listUsers()])
      .then(([t, u]) => { setTickets(t); setUsers(u); })
      .catch(() => setError('Could not load your tickets.'))
      .finally(() => setLoading(false));
  }, []);

  const agentById = Object.fromEntries(users.map((u) => [u._id, u.name]));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" variant="outlined">{error}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>My Tickets</Typography>
        <Typography variant="body2" color="text.secondary">
          Tickets where you&apos;re the assignee or a collaborator, across every status.
        </Typography>
      </Box>

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>SLA</TableCell>
                <TableCell>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map((t) => (
                <TableRow key={t._id} hover>
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
                    <Typography variant="body2">
                      {t.primaryAssigneeId
                        ? (agentById[t.primaryAssigneeId] || '…')
                        : <Typography component="span" variant="body2" color="text.secondary" fontStyle="italic">Unassigned</Typography>
                      }
                    </Typography>
                  </TableCell>
                  <TableCell><SlaBadge status={t.slaStatus} /></TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}

              {tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      You have no assigned or collaborating tickets.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import api from '../api/client';
import SlaBadge from '../components/SlaBadge';
import { useAlerts } from '../context/AlertsContext';

// MUI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckIcon from '@mui/icons-material/Check';

const PRIORITY_COLOR = { low: 'default', medium: 'info', high: 'warning', urgent: 'error' };

export default function Alerts() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const { refresh }           = useAlerts();

  function load() {
    setLoading(true);
    api.get('/alerts').then(({ data }) => { setAlerts(data.alerts); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  async function acknowledge(ticketId) {
    await api.post(`/alerts/${ticketId}/acknowledge`);
    load();
    refresh();
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">SLA Alerts</Typography>
        {alerts.length > 0 && (
          <Chip label={`${alerts.length} active`} color="error" size="small" />
        )}
      </Box>

      {alerts.length === 0 ? (
        <Alert severity="success" variant="outlined">
          No active alerts — everything&apos;s within its response target.
        </Alert>
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {alerts.map(({ ticket, slaStatus }, idx) => (
              <Box key={ticket._id}>
                {idx > 0 && <Divider />}
                <ListItem
                  sx={{ py: 1.5, px: 2 }}
                  secondaryAction={
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<CheckIcon />}
                      onClick={() => acknowledge(ticket._id)}
                    >
                      Acknowledge
                    </Button>
                  }
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', pr: 2 }}>
                    <Link
                      component={RouterLink}
                      to={`/tickets/${ticket._id}`}
                      underline="hover"
                      color="text.primary"
                      fontWeight={500}
                      variant="body2"
                    >
                      {ticket.subject}
                    </Link>
                    <SlaBadge status={slaStatus} />
                    <Chip
                      label={ticket.priority}
                      color={PRIORITY_COLOR[ticket.priority] ?? 'default'}
                      size="small"
                    />
                  </Box>
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}
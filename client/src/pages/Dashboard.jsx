import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { getDashboard } from '../api/dashboard';
import { listUsers } from '../api/tickets';

// MUI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';

export default function Dashboard() {
  const [data, setData]   = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getDashboard().then(setData);
    listUsers().then(setUsers);
  }, []);

  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, flexGrow: 1 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const agentById = Object.fromEntries(users.map((u) => [u._id, u.name]));
  const byAgentLabeled = data.byAgent.map((a) => ({
    name: a.agentId === 'unassigned' ? 'Unassigned' : (agentById[a.agentId] || a.agentId),
    count: a.count,
  }));
  const resolvedChart = data.resolvedPerWeek.map((w) => ({
    week: new Date(w.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: w.count,
  }));

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Compact Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1.15rem' }}>
          Dashboard
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Real-time metrics, queue health & resolution performance
        </Typography>
      </Box>

      {/* ── Headline stats (Row 1) ── */}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard label="Open Tickets" value={data.headline.open} />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard label="Pending on customer" value={data.headline.pending} />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard label="Resolved this week" value={data.headline.resolvedThisWeek} />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard label="Breaching SLA" value={data.headline.breaching} isAlert />
        </Grid>
      </Grid>

      {/* ── 3 Charts in 1 Single Row on Desktop (Row 2) ── */}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ChartCard title="Tickets by status">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byStatus} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" fontSize={11} tick={{ fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
                    fontSize: 11,
                    padding: '6px 10px',
                  }}
                />
                <Bar dataKey="count" fill="#1e40af" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <ChartCard title="Tickets by agent">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byAgentLabeled} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
                    fontSize: 11,
                    padding: '6px 10px',
                  }}
                />
                <Bar dataKey="count" fill="#475569" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 14, md: 4 }}>
          <ChartCard title="Resolved per week (last 8 weeks)">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={resolvedChart} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" fontSize={11} tick={{ fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
                    fontSize: 11,
                    padding: '6px 10px',
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={{ r: 3, fill: '#16a34a' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, isAlert }) {
  const isBreach = isAlert && value > 0;
  return (
    <Card
      sx={{
        height: '100%',
        bgcolor: isBreach ? '#fef2f2' : 'background.paper',
        borderColor: isBreach ? '#fca5a5' : 'divider',
        transition: 'box-shadow 0.2s',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        },
      }}
    >
      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              color: isBreach ? 'error.dark' : 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontSize: '0.7rem',
            }}
          >
            {label}
          </Typography>
        </Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            fontSize: '1.65rem',
            my: 0.5,
            color: isBreach ? 'error.main' : 'text.primary',
            lineHeight: 1.1,
          }}
        >
          {value ?? '—'}
        </Typography>
        <Divider sx={{ my: 0.5, borderColor: isBreach ? '#fee2e2' : 'divider' }} />
        <Typography
          variant="caption"
          sx={{
            color: isBreach ? 'error.dark' : 'text.secondary',
            fontSize: '0.6875rem',
            display: 'block',
          }}
        >
          {isBreach ? 'Action required' : 'Active queue target'}
        </Typography>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        transition: 'box-shadow 0.2s',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        },
      }}
    >
      <CardContent sx={{ p: 1.75, flexGrow: 1, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 1.5 } }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.primary', fontSize: '0.8125rem' }}>
          {title}
        </Typography>
        <Box sx={{ width: '100%', flexGrow: 1, minHeight: 190 }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}
import { NavLink, Outlet } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAuth } from '../context/useAuth';
import { useAlerts } from '../context/AlertsContext';

const NAV_ITEMS = [
  { label: 'Queue',      to: '/',          end: true },
  { label: 'My Tickets', to: '/mine',      agentOnly: true },
  { label: 'Dashboard',  to: '/dashboard' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { count: alertCount } = useAlerts();

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.agentOnly || user.role === 'agent');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {/* Brand */}
          <Typography
            variant="subtitle2"
            component="span"
            sx={{ mr: 3, color: 'primary.main', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}
          >
            Support Queue
          </Typography>

          <Divider orientation="vertical" flexItem sx={{ mr: 2, borderColor: 'divider' }} />

          {/* Nav links */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {visibleNavItems.map(({ label, to, end }) => (
              <Button
                key={to}
                component={NavLink}
                to={to}
                end={end}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&.active': { color: 'primary.main', bgcolor: 'primary.50',
                    '&:hover': { bgcolor: 'primary.100' } },
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {label}
              </Button>
            ))}

            {/* Alerts with badge */}
            <Button
              component={NavLink}
              to="/alerts"
              size="small"
              sx={{
                color: 'text.secondary',
                '&.active': { color: 'primary.main', bgcolor: 'primary.50' },
                '&:hover': { bgcolor: 'action.hover' },
              }}
              startIcon={
                <Badge badgeContent={alertCount > 0 ? alertCount : null} color="error" max={99}>
                  <NotificationsIcon fontSize="small" />
                </Badge>
              }
            >
              Alerts
            </Button>
          </Box>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* User info + logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {user?.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                px: 1, py: 0.25, borderRadius: 1,
                bgcolor: 'grey.100', color: 'text.secondary',
                textTransform: 'uppercase', fontWeight: 600, fontSize: '0.65rem',
              }}
            >
              {user?.role}
            </Typography>
            <Tooltip title="Sign out">
              <IconButton size="small" onClick={logout} sx={{ color: 'text.secondary' }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Page content — offset by AppBar height */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '52px',
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 52px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: 3,
            width: '100%',
            maxWidth: 1600,
            mx: 'auto',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
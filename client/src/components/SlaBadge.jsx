import Chip from '@mui/material/Chip';

const CONFIG = {
  ok:       { label: 'On track', color: 'success' },
  at_risk:  { label: 'At risk',  color: 'warning' },
  breached: { label: 'Breached', color: 'error'   },
};

export default function SlaBadge({ status }) {
  const { label, color } = CONFIG[status] ?? { label: status ?? '—', color: 'default' };
  return <Chip label={label} color={color} size="small" />;
}
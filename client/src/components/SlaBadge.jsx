const LABELS = { ok: 'On track', at_risk: 'At risk', breached: 'Breached' };
export default function SlaBadge({ status }) {
  return <span className={`sla-badge sla-${status}`}>{LABELS[status] || status}</span>;
}
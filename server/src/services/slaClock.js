function computeElapsedMs(ticket, now = new Date()) {
  const pendingGap = ticket.pendingSince ? now.getTime() - ticket.pendingSince.getTime() : 0;
  return (now.getTime() - ticket.createdAt.getTime()) - ticket.totalPausedMs - pendingGap;
}

const AT_RISK_WINDOW_MS = 30 * 60 * 1000; // fixed 30 min, per earlier decision

// Breach only makes sense for tickets still awaiting a response — Resolved
// and Closed tickets are excluded, since their clock has already stopped
// mattering for SLA purposes.
function getSlaStatus(ticket, now = new Date()) {
  if (['Resolved', 'Closed'].includes(ticket.status)) return 'ok';
  const elapsedMs = computeElapsedMs(ticket, now);
  const targetMs = ticket.firstResponseTargetMinutes * 60 * 1000;
  if (elapsedMs > targetMs) return 'breached';
  if (targetMs - elapsedMs <= AT_RISK_WINDOW_MS) return 'at_risk';
  return 'ok';
}

// An alert is "active" if the ticket is currently breached/at-risk AND either
// never acknowledged, or reopened since the last acknowledgment — this is
// what makes "reopen and breach again -> alert returns" work.
function isAlertActive(ticket, now = new Date()) {
  const status = getSlaStatus(ticket, now);
  if (status === 'ok') return false;
  if (!ticket.acknowledgedAlertAt) return true;
  if (ticket.reopenedAt && ticket.reopenedAt > ticket.acknowledgedAlertAt) return true;
  return false;
}

module.exports = { computeElapsedMs, getSlaStatus, isAlertActive, AT_RISK_WINDOW_MS };
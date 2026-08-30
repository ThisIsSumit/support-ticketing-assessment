const { ALLOWED_TRANSITIONS, REOPEN_WINDOW_MS } = require('../constants/status');

class StatusTransitionError extends Error {}

function applyStatusChange(ticket, newStatus, actorId) {
  const current = ticket.status;

  if (!ALLOWED_TRANSITIONS[current]?.includes(newStatus)) {
    throw new StatusTransitionError(`Cannot move a ticket from ${current} to ${newStatus}`);
  }

  if (current === 'Closed' && newStatus === 'Open') {
    const elapsedSinceClose = Date.now() - ticket.closedAt.getTime();
    if (elapsedSinceClose > REOPEN_WINDOW_MS) {
      throw new StatusTransitionError('This ticket closed more than 7 days ago and can no longer be reopened');
    }
  }

  const now = new Date();

  // Leaving Pending accumulates paused time; entering it starts the pause.
  if (current === 'Pending' && ticket.pendingSince) {
    ticket.totalPausedMs += now.getTime() - ticket.pendingSince.getTime();
    ticket.pendingSince = null;
  }
  if (newStatus === 'Pending') ticket.pendingSince = now;

  if (newStatus === 'Resolved') ticket.resolvedAt = now;
  if (current === 'Resolved' && newStatus === 'Open') ticket.resolvedAt = null;

  if (newStatus === 'Closed') ticket.closedAt = now;
  if (current === 'Closed' && newStatus === 'Open') {
    ticket.closedAt = null;
    ticket.reopenedAt = now; // session 6 alerts use this to know a breach is "new"
  }

  ticket.status = newStatus;

  return { type: 'status_change', ticketId: ticket._id, actorId, fromValue: current, toValue: newStatus };
}

module.exports = { applyStatusChange, StatusTransitionError };

const Ticket = require('../models/Ticket');

async function loadTicket(req, res, next) {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  req.ticket = ticket;
  next();
}

function requireTicketAccess(req, res, next) {
  const { role, sub } = req.user;
  if (role === 'supervisor') return next();

  const isAssignee = req.ticket.primaryAssigneeId?.equals(sub) ?? false;
  const isCollaborator = req.ticket.collaboratorIds.some((id) => id.equals(sub));
  if (!isAssignee && !isCollaborator) {
    return res.status(403).json({ error: 'You are not assigned to or collaborating on this ticket' });
  }
  next();
}

module.exports = { loadTicket, requireTicketAccess };
const express = require('express');
const Ticket = require('../models/Ticket');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { isAlertActive, getSlaStatus } = require('../services/slaClock');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const { role, sub } = req.user;
  const scopeFilter = role === 'supervisor'
    ? {}
    : { $or: [{ primaryAssigneeId: sub }, { collaboratorIds: sub }] };

  const candidates = await Ticket.find({
    ...scopeFilter,
    status: { $in: ['New', 'Open', 'Pending'] },
    archivedAt: null,
  });

  const now = new Date();
  const active = candidates
    .filter((t) => isAlertActive(t, now))
    .map((t) => ({ ticket: t, slaStatus: getSlaStatus(t, now) }));

  res.json({ count: active.length, alerts: active });
}));

router.post('/:id/acknowledge', asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const { role, sub } = req.user;
  const isAssignee = ticket.primaryAssigneeId?.equals(sub) ?? false;
  if (role !== 'supervisor' && !isAssignee) {
    return res.status(403).json({ error: 'Only the assigned agent can acknowledge this alert' });
  }

  ticket.acknowledgedAlertAt = new Date();
  await ticket.save();
  res.json(ticket);
}));

module.exports = router;
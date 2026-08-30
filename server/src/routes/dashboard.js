const express = require('express');
const Ticket = require('../models/Ticket');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { getSlaStatus } = require('../services/slaClock');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

  const [openCount, pendingCount, resolvedThisWeek, byStatus, byAgent, unresolvedTickets, resolvedLast8Weeks] =
    await Promise.all([
      Ticket.countDocuments({ status: 'Open', archivedAt: null }),
      Ticket.countDocuments({ status: 'Pending', archivedAt: null }),
      Ticket.countDocuments({ resolvedAt: { $gte: weekAgo }, archivedAt: null }),
      Ticket.aggregate([{ $match: { archivedAt: null } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $match: { archivedAt: null } }, { $group: { _id: '$primaryAssigneeId', count: { $sum: 1 } } }]),
      // Fetched in JS rather than aggregated in Mongo — see note below.
      Ticket.find({ status: { $in: ['New', 'Open', 'Pending'] }, archivedAt: null }),
      Ticket.aggregate([
        { $match: { resolvedAt: { $gte: eightWeeksAgo } } },
        { $group: { _id: { $dateTrunc: { date: '$resolvedAt', unit: 'week' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

  const breachingCount = unresolvedTickets.filter((t) => getSlaStatus(t, now) === 'breached').length;

  res.json({
    headline: { open: openCount, pending: pendingCount, resolvedThisWeek, breaching: breachingCount },
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    byAgent: byAgent.map((a) => ({ agentId: a._id || 'unassigned', count: a.count })),
    resolvedPerWeek: resolvedLast8Weeks.map((w) => ({ weekStart: w._id, count: w.count })),
  });
}));

module.exports = router;

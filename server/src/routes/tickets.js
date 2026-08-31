const express = require('express');
const Ticket = require('../models/Ticket');
const Reply = require('../models/Reply');
const TicketEvent = require('../models/TicketEvent');
const { requireAuth, requireRole } = require('../middleware/auth');
const { loadTicket, requireTicketAccess } = require('../middleware/loadTicket');
const { TARGET_MINUTES_BY_PRIORITY } = require('../constants/sla');
const { CATEGORIES } = require('../constants/categories');
const asyncHandler = require('../middleware/asyncHandler');
const { applyStatusChange } = require('../services/ticketStatus');
const { buildTicketFilter } = require('../services/ticketQuery');
const { getSlaStatus } = require('../services/slaClock');
const router = express.Router();
router.use(requireAuth);

// Create — any authenticated user
router.post('/', asyncHandler(async (req, res) => {
  const { subject, description, requesterEmail, priority, category, primaryAssigneeId } = req.body;
  if (!TARGET_MINUTES_BY_PRIORITY[priority]) {
    return res.status(400).json({ error: `Invalid priority: ${priority}` });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Invalid category: ${category}` });
  }
  const status = primaryAssigneeId ? 'Open' : 'New';
  const ticket = await Ticket.create({
    subject, description, requesterEmail, priority, category,
    primaryAssigneeId: primaryAssigneeId || null,
    status,
    firstResponseTargetMinutes: TARGET_MINUTES_BY_PRIORITY[priority],
  });
  await TicketEvent.create({
    ticketId: ticket._id, type: 'created', actorId: req.user.sub, toValue: status,
  });
  res.status(201).json(ticket);
}));

// "Mine" — goal 5: assignee or collaborator, across all statuses
router.get('/mine',asyncHandler (async (req, res) => {
  const tickets = await Ticket.find({
    archivedAt: null,
    $or: [{ primaryAssigneeId: req.user.sub }, { collaboratorIds: req.user.sub }],
  }).sort({ updatedAt: -1 });
  const withSla = tickets.map((t) => ({ ...t.toObject(), slaStatus: getSlaStatus(t) }));
  res.json(withSla);
}));

router.patch('/:id/collaborators', loadTicket, requireTicketAccess, asyncHandler(async (req, res) => {
  const { collaboratorIds } = req.body; // full replacement list, not add/remove deltas
  const fromValue = req.ticket.collaboratorIds.map((id) => id.toString()).join(',');
  req.ticket.collaboratorIds = collaboratorIds;
  await req.ticket.save();
  await TicketEvent.create({
    ticketId: req.ticket._id, type: 'reassignment', actorId: req.user.sub,
    fromValue: fromValue || null, toValue: collaboratorIds.join(','),
  });
  res.json(req.ticket);
}));

router.post('/:id/claim', loadTicket, asyncHandler(async (req, res) => {
  if (req.ticket.primaryAssigneeId) {
    return res.status(400).json({ error: 'This ticket is already assigned' });
  }
  req.ticket.primaryAssigneeId = req.user.sub;
  req.ticket.status = 'Open';
  await req.ticket.save();
  await TicketEvent.create({
    ticketId: req.ticket._id, type: 'reassignment', actorId: req.user.sub,
    fromValue: null, toValue: req.user.sub,
  });
  await TicketEvent.create({
    ticketId: req.ticket._id, type: 'status_change', actorId: req.user.sub,
    fromValue: 'New', toValue: 'Open',
  });
  res.json(req.ticket);
}));
// Bulk reassign — supervisor only, matching the single-ticket rule.
router.post('/bulk/reassign', requireRole('supervisor'), asyncHandler(async (req, res) => {
  const { ticketIds, newAssigneeId } = req.body;
  const results = [];

  for (const id of ticketIds) {
    try {
      const ticket = await Ticket.findById(id);
      if (!ticket) {
        results.push({ ticketId: id, success: false, reason: 'Ticket not found' });
        continue;
      }
      const fromValue = ticket.primaryAssigneeId?.toString() || null;
      const wasUnassigned = ticket.status === 'New';
      ticket.primaryAssigneeId = newAssigneeId;
      if (wasUnassigned) ticket.status = 'Open';
      await ticket.save();

      await TicketEvent.create({
        ticketId: ticket._id, type: 'reassignment', actorId: req.user.sub,
        fromValue, toValue: newAssigneeId,
      });
      if (wasUnassigned) {
        await TicketEvent.create({
          ticketId: ticket._id, type: 'status_change', actorId: req.user.sub,
          fromValue: 'New', toValue: 'Open',
        });
      }
      results.push({ ticketId: id, success: true });
    } catch (err) {
      results.push({ ticketId: id, success: false, reason: err.message });
    }
  }
  res.json({ results });
}));

// Bulk close — reuses the same transition engine as the single-ticket status
// endpoint, so a ticket not currently in Resolved is rejected per-ticket with
// the real reason, not silently skipped or failing the whole batch.
router.post('/bulk/close', asyncHandler(async (req, res) => {
  const { ticketIds } = req.body;
  const results = [];

  for (const id of ticketIds) {
    try {
      const ticket = await Ticket.findById(id);
      if (!ticket) {
        results.push({ ticketId: id, success: false, reason: 'Ticket not found' });
        continue;
      }
      const { role, sub } = req.user;
      const isAssignee = ticket.primaryAssigneeId?.equals(sub) ?? false;
      const isCollaborator = ticket.collaboratorIds.some((cid) => cid.equals(sub));
      if (role !== 'supervisor' && !isAssignee && !isCollaborator) {
        results.push({ ticketId: id, success: false, reason: 'Not assigned to or collaborating on this ticket' });
        continue;
      }

      const eventData = applyStatusChange(ticket, 'Closed', req.user.sub);
      await ticket.save();
      await TicketEvent.create(eventData);
      results.push({ ticketId: id, success: true });
    } catch (err) {
      results.push({ ticketId: id, success: false, reason: err.message });
    }
  }
  res.json({ results });
}));

// CSV export of the currently filtered queue — same filter contract as GET /.
router.get('/export', asyncHandler(async (req, res) => {
  const filter = buildTicketFilter(req.query);
  const tickets = await Ticket.find(filter).sort({ createdAt: -1 });

  const header = ['Subject', 'Status', 'Priority', 'Category', 'Requester', 'Assignee', 'Created'];
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = tickets.map((t) => [
    t.subject, t.status, t.priority, t.category, t.requesterEmail,
    t.primaryAssigneeId?.toString() || 'Unassigned', t.createdAt.toISOString(),
  ].map(escape).join(','));

  const csv = [header.map(escape).join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tickets-export.csv"');
  res.send(csv);
}));
// Full queue — read access for everyone; write access is what's restricted.
// (Flagging this as a decision to record: agents can *see* the whole shared
// queue, matching "one shared queue that replaces the group inbox" in the
// brief, but can only *act* on their own tickets.)
const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };
const SORTABLE_FIELDS = { createdAt: 'createdAt', updatedAt: 'updatedAt' }; // priority sorted separately below

router.get('/', asyncHandler(async (req, res) => {
  const {
    q, status, priority, category, assignee,
    sortBy = 'createdAt', sortDir = 'desc',
    page = '1', pageSize = '20',
  } = req.query;

 const filter = buildTicketFilter(req.query);;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (assignee === 'unassigned') filter.primaryAssigneeId = null;
  else if (assignee) filter.primaryAssigneeId = assignee;
  if (q) filter.$text = { $search: q };

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const size = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100); // cap to stop abuse
  const dir = sortDir === 'asc' ? 1 : -1;

  const total = await Ticket.countDocuments(filter);

  let query = Ticket.find(filter);

  if (sortBy === 'priority') {
    // Mongo can't sort by a JS object map, so we sort in-memory for this one case.
    // Fine at demo scale; noted in schema.md as something that needs an aggregation
    // pipeline with $switch (or a stored numeric priorityRank field) at real scale.
    const all = await query.lean();
    all.sort((a, b) => dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]));
    const paged = all.slice((pageNum - 1) * size, pageNum * size);
    const withSla = paged.map((t) => ({ ...(t.toObject ? t.toObject() : t), slaStatus: getSlaStatus(t) }));
    return res.json({ tickets: withSla, total, page: pageNum, pageSize: size });
  }

  const sortField = SORTABLE_FIELDS[sortBy] || 'createdAt';
  const tickets = await query
    .sort({ [sortField]: dir })
    .skip((pageNum - 1) * size)
    .limit(size);
const withSla = tickets.map((t) => ({ ...(t.toObject ? t.toObject() : t), slaStatus: getSlaStatus(t) }));
res.json({ tickets: withSla, total, page: pageNum, pageSize: size });
 
}));

router.get('/:id', loadTicket, requireTicketAccess, asyncHandler(async (req, res) => {
  const [replies, events] = await Promise.all([
    Reply.find({ ticketId: req.ticket._id }).sort({ createdAt: 1 }),
    TicketEvent.find({ ticketId: req.ticket._id }).sort({ createdAt: 1 }),
  ]);
  res.json({ ticket: req.ticket, replies, events });
}));

// Edit — subject/description/priority/category only. Assignee changes go
// through a separate reassign endpoint (below), which is what actually
// enforces "agents cannot reassign a ticket away from themselves" — there's
// simply no field here that lets them touch primaryAssigneeId.
router.patch('/:id', loadTicket, requireTicketAccess, asyncHandler(async (req, res) => {
  const { subject, description, priority, category } = req.body;
  if (priority && !TARGET_MINUTES_BY_PRIORITY[priority]) {
    return res.status(400).json({ error: `Invalid priority: ${priority}` });
  }
  Object.assign(req.ticket, {
    ...(subject && { subject }),
    ...(description && { description }),
    ...(priority && { priority }),
    ...(category && { category }),
  });
  await req.ticket.save();
  res.json(req.ticket);
}));

// Reassign — supervisor only, full stop. Enforces the other half of goal 1.
router.patch('/:id/reassign', loadTicket, requireRole('supervisor'), asyncHandler(async (req, res) => {
  const { newAssigneeId } = req.body;
  const fromValue = req.ticket.primaryAssigneeId?.toString() || null;
  req.ticket.primaryAssigneeId = newAssigneeId;

  const wasUnassigned = req.ticket.status === 'New';
  if (wasUnassigned) req.ticket.status = 'Open';

  await req.ticket.save();
  await TicketEvent.create({
    ticketId: req.ticket._id, type: 'reassignment', actorId: req.user.sub,
    fromValue, toValue: newAssigneeId,
  });
  if (wasUnassigned) {
    await TicketEvent.create({
      ticketId: req.ticket._id, type: 'status_change', actorId: req.user.sub,
      fromValue: 'New', toValue: 'Open',
    });
  }
  res.json(req.ticket);
}));

router.post('/:id/archive', loadTicket, requireTicketAccess, asyncHandler(async (req, res) => {
  req.ticket.archivedAt = new Date();
  await req.ticket.save();
  res.json(req.ticket);
}));

router.post('/:id/restore', loadTicket, requireTicketAccess, asyncHandler(async (req, res) => {
  req.ticket.archivedAt = null;
  await req.ticket.save();
  res.json(req.ticket);
}));

// Replies — assignee, collaborator, or supervisor
router.post('/:id/replies', loadTicket, requireTicketAccess, asyncHandler(async (req, res) => {
  const { body, isInternal } = req.body;
  const reply = await Reply.create({
    ticketId: req.ticket._id, authorId: req.user.sub, body, isInternal: !!isInternal,
  });
  await TicketEvent.create({
    ticketId: req.ticket._id, type: 'reply', actorId: req.user.sub,
  });
  res.status(201).json(reply);
}));

router.patch('/:id/status', loadTicket, requireTicketAccess, asyncHandler(async (req, res) => {
  const { newStatus } = req.body;
  const eventData = applyStatusChange(req.ticket, newStatus, req.user.sub);
  await req.ticket.save();
  await TicketEvent.create(eventData);
  res.json(req.ticket);
}));

router.post('/:id/replies', loadTicket, requireTicketAccess, asyncHandler(async (req, res) => {
  const { body, isInternal, authorType } = req.body;
  const reply = await Reply.create({
    ticketId: req.ticket._id, authorId: req.user.sub, body, isInternal: !!isInternal,
    authorType: authorType === 'customer' ? 'customer' : 'agent',
  });
  await TicketEvent.create({ ticketId: req.ticket._id, type: 'reply', actorId: req.user.sub });

  if (reply.authorType === 'customer' && req.ticket.status === 'Pending') {
    const eventData = applyStatusChange(req.ticket, 'Open', req.user.sub);
    await req.ticket.save();
    await TicketEvent.create(eventData);
  }
  res.status(201).json(reply);
}));

module.exports = router;
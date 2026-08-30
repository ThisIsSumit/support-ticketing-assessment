const express = require('express');
const Ticket = require('../models/Ticket');
const Reply = require('../models/Reply');
const TicketEvent = require('../models/TicketEvent');
const { requireAuth, requireRole } = require('../middleware/auth');
const { loadTicket, requireTicketAccess } = require('../middleware/loadTicket');
const { TARGET_MINUTES_BY_PRIORITY } = require('../constants/sla');
const { CATEGORIES } = require('../constants/categories');

const router = express.Router();
router.use(requireAuth);

// Create — any authenticated user
router.post('/', async (req, res) => {
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
});

// "Mine" — goal 5: assignee or collaborator, across all statuses
router.get('/mine', async (req, res) => {
  const tickets = await Ticket.find({
    archivedAt: null,
    $or: [{ primaryAssigneeId: req.user.sub }, { collaboratorIds: req.user.sub }],
  }).sort({ updatedAt: -1 });
  res.json(tickets);
});

// Full queue — read access for everyone; write access is what's restricted.
// (Flagging this as a decision to record: agents can *see* the whole shared
// queue, matching "one shared queue that replaces the group inbox" in the
// brief, but can only *act* on their own tickets.)
router.get('/', async (req, res) => {
  const tickets = await Ticket.find({ archivedAt: null }).sort({ createdAt: -1 }).limit(50);
  res.json(tickets); // real filter/sort/pagination arrives in session 4
});

router.get('/:id', loadTicket, requireTicketAccess, async (req, res) => {
  const [replies, events] = await Promise.all([
    Reply.find({ ticketId: req.ticket._id }).sort({ createdAt: 1 }),
    TicketEvent.find({ ticketId: req.ticket._id }).sort({ createdAt: 1 }),
  ]);
  res.json({ ticket: req.ticket, replies, events });
});

// Edit — subject/description/priority/category only. Assignee changes go
// through a separate reassign endpoint (below), which is what actually
// enforces "agents cannot reassign a ticket away from themselves" — there's
// simply no field here that lets them touch primaryAssigneeId.
router.patch('/:id', loadTicket, requireTicketAccess, async (req, res) => {
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
});

// Reassign — supervisor only, full stop. Enforces the other half of goal 1.
router.patch('/:id/reassign', loadTicket, requireRole('supervisor'), async (req, res) => {
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
});

router.post('/:id/archive', loadTicket, requireTicketAccess, async (req, res) => {
  req.ticket.archivedAt = new Date();
  await req.ticket.save();
  res.json(req.ticket);
});

router.post('/:id/restore', loadTicket, requireTicketAccess, async (req, res) => {
  req.ticket.archivedAt = null;
  await req.ticket.save();
  res.json(req.ticket);
});

// Replies — assignee, collaborator, or supervisor
router.post('/:id/replies', loadTicket, requireTicketAccess, async (req, res) => {
  const { body, isInternal } = req.body;
  const reply = await Reply.create({
    ticketId: req.ticket._id, authorId: req.user.sub, body, isInternal: !!isInternal,
  });
  await TicketEvent.create({
    ticketId: req.ticket._id, type: 'reply', actorId: req.user.sub,
  });
  res.status(201).json(reply);
});

module.exports = router;
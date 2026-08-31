require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const Reply = require('./models/Reply');
const TicketEvent = require('./models/TicketEvent');
const { TARGET_MINUTES_BY_PRIORITY } = require('./constants/sla');

const DAY = 24 * 60 * 60 * 1000;
const ago = (ms) => new Date(Date.now() - ms);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Wiping existing data...');
  await Promise.all([
    User.deleteMany({}), Ticket.deleteMany({}), Reply.deleteMany({}), TicketEvent.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('password123', 10);
  const [supervisor, alex, priya, jordan] = await User.create([
    { email: 'supervisor@demo.com', passwordHash, name: 'Sam Supervisor', role: 'supervisor' },
    { email: 'agent@demo.com', passwordHash, name: 'Alex Agent', role: 'agent' },
    { email: 'priya@demo.com', passwordHash, name: 'Priya Nair', role: 'agent' },
    { email: 'jordan@demo.com', passwordHash, name: 'Jordan Lee', role: 'agent' },
  ]);
  console.log('Created 4 users (1 supervisor, 3 agents).');

  const events = [];
  const replies = [];

  async function makeTicket({
    subject, description, requesterEmail, priority, category,
    status, assignee, collaborators = [], createdDaysAgo,
    pendingSince = null, totalPausedMs = 0, resolvedDaysAgo = null,
    closedDaysAgo = null, reopenedDaysAgo = null, archived = false,
    acknowledgedDaysAgo = null,
  }) {
    const createdAt = ago(createdDaysAgo * DAY);
    const ticket = await Ticket.create({
      subject, description, requesterEmail, priority, category, status,
      primaryAssigneeId: assignee || null,
      collaboratorIds: collaborators,
      firstResponseTargetMinutes: TARGET_MINUTES_BY_PRIORITY[priority],
      createdAt,
      pendingSince,
      totalPausedMs,
      resolvedAt: resolvedDaysAgo !== null ? ago(resolvedDaysAgo * DAY) : null,
      closedAt: closedDaysAgo !== null ? ago(closedDaysAgo * DAY) : null,
      reopenedAt: reopenedDaysAgo !== null ? ago(reopenedDaysAgo * DAY) : null,
      archivedAt: archived ? ago(1 * DAY) : null,
      acknowledgedAlertAt: acknowledgedDaysAgo !== null ? ago(acknowedgedDaysAgo * DAY) : null,
    });
    events.push({
      ticketId: ticket._id, type: 'created', actorId: supervisor._id,
      toValue: assignee ? 'Open' : 'New', createdAt,
    });
    return ticket;
  }

  // -- New / unassigned (2) --
  await makeTicket({
    subject: 'How do I export my data', description: 'Looking for a CSV export option in settings.',
    requesterEmail: 'dana@customer.com', priority: 'low', category: 'how_to',
    status: 'New', assignee: null, createdDaysAgo: 0.5,
  });
  const unassignedBug = await makeTicket({
    subject: 'Dashboard chart not loading', description: 'The weekly chart spins forever and never renders.',
    requesterEmail: 'omar@customer.com', priority: 'high', category: 'bug',
    status: 'New', assignee: null, createdDaysAgo: 0.2,
  });

  // -- Open (5), varied priority/category/assignee, one with collaborators --
  await makeTicket({
    subject: 'Login button unresponsive', description: 'Nothing happens when clicking sign in on Safari.',
    requesterEmail: 'lee@customer.com', priority: 'high', category: 'bug',
    status: 'Open', assignee: alex._id, createdDaysAgo: 1,
  });
  const collabTicket = await makeTicket({
    subject: 'Enterprise SSO setup questions', description: 'Need help configuring SAML for our org.',
    requesterEmail: 'it@bigcorp.com', priority: 'urgent', category: 'other',
    status: 'Open', assignee: priya._id, collaborators: [jordan._id], createdDaysAgo: 0.1,
  });
  events.push({
    ticketId: collabTicket._id, type: 'reassignment', actorId: supervisor._id,
    fromValue: null, toValue: jordan._id.toString(), createdAt: ago(0.05 * DAY),
  });
  await makeTicket({
    subject: 'Double charged this month', description: 'Two charges of $49 appeared on my card.',
    requesterEmail: 'fatima@customer.com', priority: 'medium', category: 'billing',
    status: 'Open', assignee: jordan._id, createdDaysAgo: 2,
  });
  await makeTicket({
    subject: 'Feature request: dark mode', description: 'Would love a dark theme option.',
    requesterEmail: 'sam@customer.com', priority: 'low', category: 'feature_request',
    status: 'Open', assignee: alex._id, createdDaysAgo: 3,
  });
  const breachedTicket = await makeTicket({
    subject: 'Server returning 500 errors', description: 'Getting internal server errors on checkout.',
    requesterEmail: 'noah@customer.com', priority: 'urgent', category: 'bug',
    status: 'Open', assignee: priya._id, createdDaysAgo: 1.5, // urgent target is 60min, so this is well breached
  });

  // -- Pending (3) — customer waiting, clock paused --
  await makeTicket({
    subject: 'Need screenshots to reproduce', description: 'Asked customer for steps to reproduce the crash.',
    requesterEmail: 'ivy@customer.com', priority: 'medium', category: 'bug',
    status: 'Pending', assignee: alex._id, createdDaysAgo: 4,
    pendingSince: ago(1 * DAY), totalPausedMs: 0,
  });
  await makeTicket({
    subject: 'Awaiting invoice confirmation from finance team', description: 'Waiting on customer to confirm invoice number.',
    requesterEmail: 'greg@customer.com', priority: 'low', category: 'billing',
    status: 'Pending', assignee: jordan._id, createdDaysAgo: 5,
    pendingSince: ago(2 * DAY), totalPausedMs: 3 * 60 * 60 * 1000,
  });
  await makeTicket({
    subject: 'Clarifying which plan tier they need', description: 'Sent pricing comparison, awaiting response.',
    requesterEmail: 'wei@customer.com', priority: 'medium', category: 'other',
    status: 'Pending', assignee: priya._id, createdDaysAgo: 2,
    pendingSince: ago(0.5 * DAY),
  });

  // -- Resolved (6), spread across the last 8 weeks for the dashboard chart --
  const resolvedSpread = [3, 10, 17, 24, 31, 45]; // days ago, one per-ish week
  for (const [i, daysAgo] of resolvedSpread.entries()) {
    await makeTicket({
      subject: `Resolved issue #${i + 1}`, description: 'Resolved and closed out after a fix was shipped.',
      requesterEmail: `customer${i}@demo.com`, priority: ['low', 'medium', 'high', 'urgent'][i % 4],
      category: ['bug', 'billing', 'how_to', 'other'][i % 4],
      status: 'Resolved', assignee: [alex, priya, jordan][i % 3]._id,
      createdDaysAgo: daysAgo + 2, resolvedDaysAgo: daysAgo,
    });
  }

  // -- Closed (3): one fresh (reopenable), one at the edge, one long past the 7-day window --
  await makeTicket({
    subject: 'Password reset not arriving', description: 'Reset email was delayed by spam filter, resolved.',
    requesterEmail: 'ben@customer.com', priority: 'medium', category: 'bug',
    status: 'Closed', assignee: alex._id, createdDaysAgo: 4, resolvedDaysAgo: 2, closedDaysAgo: 1,
  });
  await makeTicket({
    subject: 'Refund processed', description: 'Refund confirmed and ticket closed.',
    requesterEmail: 'clara@customer.com', priority: 'low', category: 'billing',
    status: 'Closed', assignee: jordan._id, createdDaysAgo: 10, resolvedDaysAgo: 8, closedDaysAgo: 6.9,
    // just inside the 7-day reopen window, useful for demoing a successful reopen
  });
  await makeTicket({
    subject: 'Old bug report from last month', description: 'Fixed and closed well over a week ago.',
    requesterEmail: 'theo@customer.com', priority: 'low', category: 'bug',
    status: 'Closed', assignee: priya._id, createdDaysAgo: 20, resolvedDaysAgo: 18, closedDaysAgo: 15,
    // outside the 7-day window — good for demoing the rejection message
  });

  // -- Archived (2) --
  await makeTicket({
    subject: 'Duplicate of another ticket', description: 'Same issue reported twice, archived the duplicate.',
    requesterEmail: 'nora@customer.com', priority: 'low', category: 'other',
    status: 'Closed', assignee: alex._id, createdDaysAgo: 12, resolvedDaysAgo: 11, closedDaysAgo: 10, archived: true,
  });
  await makeTicket({
    subject: 'Spam / not a real request', description: 'Determined not to be a genuine support request.',
    requesterEmail: 'spam@example.com', priority: 'low', category: 'other',
    status: 'New', assignee: null, createdDaysAgo: 15, archived: true,
  });

  await TicketEvent.insertMany(events);

  // -- Replies: a mix of internal notes, agent replies, and logged customer replies --
  await Reply.insertMany([
    { ticketId: breachedTicket._id, authorId: priya._id, authorType: 'agent',
      body: 'Looking into this now, seems related to the payment gateway timeout.', isInternal: false,
      createdAt: ago(1.4 * DAY) },
    { ticketId: breachedTicket._id, authorId: priya._id, authorType: 'agent',
      body: 'Confirmed with backend team — gateway had an outage window.', isInternal: true,
      createdAt: ago(1.3 * DAY) },
    { ticketId: collabTicket._id, authorId: jordan._id, authorType: 'agent',
      body: 'Sent over our SAML metadata XML and setup docs.', isInternal: false,
      createdAt: ago(0.08 * DAY) },
    { ticketId: unassignedBug._id, authorId: supervisor._id, authorType: 'customer',
      body: 'Still happening, tried refreshing multiple times.', isInternal: false,
      createdAt: ago(0.1 * DAY) },
  ]);

  console.log('Seed complete:');
  console.log('  4 users, 22 tickets across all 5 statuses, all 4 priorities, all 5 categories');
  console.log('  Includes: 2 unassigned, 1 with collaborators, 3 pending, 6 resolved spread over 8 weeks,');
  console.log('  3 closed (1 freshly closed, 1 near the reopen edge, 1 past the reopen window), 2 archived,');
  console.log('  4 replies (internal note, agent reply, logged customer reply).');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
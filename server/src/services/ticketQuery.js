function buildTicketFilter({ q, status, priority, category, assignee }) {
  const filter = { archivedAt: null };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (assignee === 'unassigned') filter.primaryAssigneeId = null;
  else if (assignee) filter.primaryAssigneeId = assignee;
  if (q) filter.$text = { $search: q };
  return filter;
}

module.exports = { buildTicketFilter };
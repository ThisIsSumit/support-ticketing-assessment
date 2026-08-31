export const ALLOWED_TRANSITIONS = {
  New: ['Open'],
  Open: ['Pending', 'Resolved'],
  Pending: ['Open', 'Resolved'],
  Resolved: ['Closed', 'Open'],
  Closed: ['Open'],
};
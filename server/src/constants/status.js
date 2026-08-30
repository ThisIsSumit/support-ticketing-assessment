const ALLOWED_TRANSITIONS = {
  New: ['Open'],
  Open: ['Pending', 'Resolved'],
  Pending: ['Open', 'Resolved'],
  Resolved: ['Closed', 'Open'],
  Closed: ['Open'],
};

const REOPEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — provisional, revisit in decisions.md

module.exports = { ALLOWED_TRANSITIONS, REOPEN_WINDOW_MS };

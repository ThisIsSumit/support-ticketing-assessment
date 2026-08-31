# Submission

## Links

- **GitHub repository:** [FILL IN]
- **Live application:** [FILL IN]

## Notes for the reviewer

[FILL IN — e.g. "Hosted on Render's free tier, which sleeps after 15 minutes
of inactivity; the first request after a period of idle may take up to a
minute to wake the server." Also mention here if you kept the MUI redesign
or not, and anything you know is rough/incomplete.]

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Supervisor | supervisor@demo.com | password123 |
| Agent | agent@demo.com | password123 |
| Agent | priya@demo.com | password123 |
| Agent | jordan@demo.com | password123 |

## Stack

| Layer | What you used | Why |
|---|---|---|
| Frontend | React (Vite), React Router, Axios[, Material UI] | Fast dev loop, team-familiar |
| Backend | Node.js, Express, Mongoose | Standard MERN pairing |
| Database | MongoDB (Atlas) | Chosen stack; see decisions.md #1 for the Postgres trade-off considered and rejected |
| Hosting | Vercel (frontend), Render (backend), Atlas (DB) | Free tiers, brief's suggested combo |

## Goal checklist

| # | Goal | Status | Notes |
|---|---|---|---|
| 1 | Accounts and roles | Done | JWT+refresh auth; server-enforced role + ownership checks (`requireRole`, `requireTicketAccess`); verified via direct API calls bypassing the UI |
| 2 | Tickets (create/edit/archive/restore) | Done | Edit form covers subject/description/priority/category; see decisions.md #6 for a known priority/SLA-target edge case |
| 3 | Replies inside tickets | Done | Internal-note flag + `authorType` (agent/customer) — see decisions.md #3 |
| 4 | Ticket lifecycle | Done | Status transition table server-enforced; illegal moves rejected with explicit reason; SLA pause/resume tested end to end |
| 5 | Collaborators | Done | Plus a `/claim` action for unassigned tickets — see decisions.md #2 |
| 6 | Finding tickets | Done | Server-side text search, 4 filters, sort, pagination with total count |
| 7 | Bulk actions + CSV export | Done | Per-ticket success/failure reporting verified via mixed-validity test batches |
| 8 | Dashboard | Done | Headline stats, by-status/by-agent breakdowns, 8-week resolved chart |
| 9 | History / timeline | Done | Append-only `TicketEvent` collection; see decisions.md #5 for the honest scope of "immutable" |
| 10 | SLA alerts | Done | Breach + at-risk detection, acknowledge, reappears on reopen — tested live end to end |

## How much time did you actually spend?

[FILL IN]

## What would you do next, with another 12 hours?

[FILL IN — good candidates from this build: a proper claim-from-queue UX
polish, recomputing SLA target on priority edit (or making that toggleable),
a stronger TicketEvent immutability guarantee, cursor-based pagination,
websocket-based live alert updates instead of polling, a canned-response
library (stretch idea).]

## What are you least happy with in this codebase, and why?

[FILL IN — honest options based on this build: the frontend/backend status-
transition table is duplicated rather than shared (noted in the frontend
session as a real trade-off); the bulk-reassign UI used a plain prompt/select
before the MUI pass rather than a fully polished picker from the start; the
in-memory priority sort and SLA-breach computation, while documented, are
real scale limitations rather than production-grade solutions.]
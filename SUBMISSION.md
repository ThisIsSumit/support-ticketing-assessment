# Submission

## Links

- **GitHub repository:** https://github.com/ThisIsSumit/support-ticketing-assessment
- **Live application:** https://support-ticketing-ten.vercel.app/

## Notes for the reviewer

- Backend is on Render's free tier — it sleeps after 15 min idle, so the
  first request may take up to a minute to wake up.
- Frontend uses Material UI.
- Seeded with ~20 tickets across every status/priority/category, including
  unassigned, resolved, closed (in and out of the reopen window), and a
  couple currently breaching SLA — not an empty shell.
- Known trade-offs and edge cases (agent reassignment scope, SLA-on-edit
  behavior, reopen window default, a couple of scale limitations) are
  documented in decisions.md and schema.md rather than repeated here.

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

10.5 hrs

## What would you do next, with another 12 hours?

First priority would be closing the gap between "documented as a limitation"
and "actually fixed" on the two scale issues I flagged rather than solved:
the priority sort and the SLA-breach count both currently fetch-then-filter
in JavaScript instead of doing the work in MongoDB. I'd replace both with a
denormalized numeric priorityRank field (set alongside priority on write)
and a periodically recomputed currentSlaStatus field, so both become native,
indexed queries instead of full scans.

Second, I'd resolve the SLA-target-on-priority-edit question I left open in
decisions.md rather than leaving it as a documented ambiguity — I'd
implement both behaviors behind a toggle and see which holds up better
against real scenarios before committing to one.

Third, I'd add a small set of AI-assisted features on top of the data model
that's already in place, since the ticket/reply/timeline structure is
already shaped to support them without a schema change:
- **Auto-categorization on ticket creation** — call an LLM with the subject
  and description to suggest a category (bug/billing/how_to/feature_request/
  other) as a pre-filled default the agent can override, rather than a
  required manual choice every time.
- **Reply drafting** — given a ticket's description and prior replies,
  generate a suggested response an agent can edit before sending, using the
  isInternal/authorType distinction that's already modeled so drafts are
  clearly marked as suggestions, not sent automatically.
- **Thread summarization** — for tickets with a long reply history, a
  one-line AI summary in the queue table or ticket header, so a supervisor
  scanning dozens of open tickets doesn't have to open each one to see where
  it stands.
- **Priority/urgency suggestion** — flag likely-urgent language in a new
  ticket's description (e.g. "production down," "can't log in," "losing
  money") as a suggested priority bump, surfaced to the agent rather than
  auto-applied, since priority directly drives the SLA target and shouldn't
  be silently overridden by a model.

I'd treat all four as suggestions an agent confirms, not autonomous actions
— consistent with how the rest of this app treats agent judgment as
authoritative and the system as support, not replacement. I'd build
auto-categorization first, since it's the smallest, most self-contained
addition and reuses the category enum that already exists; reply drafting
second, since it's the highest-value one but needs more care around not
sending anything without a human review step.

Fourth, I'd strengthen the audit trail beyond "no route exists to edit it"
— right now TicketEvent immutability is enforced by omission, not by
infrastructure; I'd move toward a write-only credential or an external
append-only log so the guarantee is real, not just honest-by-default.

Fifth, I'd replace the polling-based alerts badge and dashboard with
websocket pushes instead of a 30-second interval — the poll was a
deliberate time-boxed choice that works for a demo but is the most
obviously dated piece if compared to a production tool.

Lower priority: unifying the frontend and backend status-transition tables
into one shared source of truth instead of two hand-maintained copies (see
below), and giving the claim-from-queue flow the same polish pass the
bulk-reassign flow got partway through this build.

## What are you least happy with in this codebase, and why?

The frontend's status-transition table (client/src/constants/statusTransitions.js)
duplicating the backend's (server/src/constants/status.js). I made this
trade-off deliberately and documented it at the time rather than discovering
it later, but I'm still not fully comfortable with it: the server is the
real enforcement either way, so a stale frontend copy would only ever show
the wrong button, never let an illegal transition actually succeed — but
"only a UI bug, not a security bug" is a lower bar than I'd want for
something a reviewer might specifically test by editing one file and not the
other. Given more time I'd have generated the frontend table from the
backend one at build time, or moved both into a shared package, rather than
trusting myself to keep two hand-written copies in sync across future
changes.

Close second: the SLA-breach computation on the dashboard. It's correct and
it's tested, but "fetch every unresolved ticket into memory and filter with
a JS loop" is exactly the kind of thing that looks fine at demo scale and
quietly becomes the first bottleneck at real scale. I chose to name it
honestly in schema.md rather than either hide it or over-engineer a proper
aggregation pipeline under time pressure — I think that was the right call
for a 12-hour budget, but it's still the part of the codebase I'd point to
first if asked "what wouldn't survive contact with production traffic."
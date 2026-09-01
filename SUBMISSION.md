# Submission

## Links

- **GitHub repository:** https://github.com/ThisIsSumit/support-ticketing-assessment
- **Live application:** https://support-ticketing-ten.vercel.app/

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

10.5 hrs

## What would you do next, with another 12 hours?

First priority would be closing the gap between "documented as a limitation"
and "actually fixed" on the two scale issues I flagged rather than solved:
the priority sort and the SLA-breach count both currently fetch-then-filter
in JavaScript instead of doing the work in MongoDB. I'd replace both with a
denormalized numeric priorityRank field (set alongside priority on write)
and a periodically recomputed currentSlaStatus field, so both become native,
indexed queries instead of full scans. That's the change I'm most confident
would matter first if this ever handled real traffic.

Second, I'd resolve the SLA-target-on-priority-edit question I left open in
decisions.md rather than leaving it as a documented ambiguity — right now
editing a ticket's priority doesn't recompute its SLA target, and while I
think that's defensible, I never actually built the alternative to compare
against. I'd implement both behind a small toggle and see which one holds up
better against a few real scenarios (an urgent ticket wrongly created as
low, versus a ticket deliberately downgraded after triage) before committing
to one.

Third, I'd strengthen the audit trail beyond "no route exists to edit it."
Right now TicketEvent immutability is enforced entirely by omission, which
is honest but not a real guarantee against direct database access. I'd look
at either a write-only service credential for the events collection or an
external append-only log, so "immutable" is actually true at the
infrastructure level, not just at the application level.

Fourth, I'd replace the polling-based alerts badge and dashboard with
websocket pushes (Socket.io or similar) — the 30-second poll was a
deliberate time-boxed choice, and it works fine for a demo, but it's the
piece of this app that would feel most obviously dated if compared to a real
production help-desk tool.

Lower priority but worth naming: unifying the frontend and backend status-
transition tables into one shared source of truth instead of two files that
have to be kept in sync by hand (see below), and cleaning up the
bulk-reassign flow, which went through a rough prompt()-based version before
I replaced it with a proper agent-picker modal — I'd want to give the
claim-from-queue flow the same polish pass, since right now it's a plain
button with no confirmation step.

If there were genuinely time left after all of that, I'd pick up a canned-
response library from the stretch list — it's the stretch idea that fits
most naturally on top of the reply system that's already built.

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
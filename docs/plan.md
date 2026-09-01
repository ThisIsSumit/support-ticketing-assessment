# Plan

## Session breakdown (actual order built)

| Session | Focus | Estimated | Actual |
|---|---|---|---|
| 1 | Backend scaffold, User model, JWT + refresh auth | 2h | 1h |
| 2 | Ticket/Reply/ticketEvent models, CRUD, ownership enforcement | 2h | 1h |
| 3 | Status transition engine + SLA clock pause/resume | 2h | 1h |
| 4 | Server-side search/filter/sort/pagination | 1h | 1.5h |
| 5 | Bulk reassign/close + CSV export | 1h |1h |
| 6 | Dashboard aggregation + SLA alerts | 1.5h | 0.5h |
| 7 | Frontend scaffold, auth context, login, nav shell | 1h | 0.5h |
| 8 | Queue table (search/filter/sort/pagination), create form | 1.5h | 0.5h |
| 9 | Ticket detail: replies, status, reassign, collaborators, timeline, edit | 2h | 1h |
| 10 | Dashboard charts, alerts page, bulk-select UI, export button | 1.5h | 1h |
| — | Bug fixes: env-var export gap, missing route registration, React setState-in-effect warning, agent-visible-but-blocked bulk-reassign button, missing edit form | — | 1h |
| — | UI polish pass (Material UI redesign) | — | 0.5h |


**Total estimated:** ~11-13h across the above (over the 12h guide — see below).
**Total actual:** 10

## Why this order

Backend before frontend, and within the backend, correctness-critical logic
before convenience features: the status-transition/SLA-clock engine (session
3) was isolated into its own service and built/tested before anything else
depended on it, since it's the piece with the most subtle rules in the brief
("any other move must be rejected... with a message explaining why"). Search/
filter/pagination and bulk actions came after core CRUD existed to filter
and act on. The frontend was deliberately built *after* every backend
endpoint it would call had already been curl-tested directly — this caught
several bugs (see below) before they could hide behind a UI.
## What I estimated vs what it actually took

Most sessions came in at or under estimate, which surprised me a little
going in — I'd budgeted conservatively for the backend sessions (1, 2, 3)
expecting more back-and-forth on the data model, but once the schema and
permission pattern were settled in session 1-2, sessions 3 and later mostly
reused the same shapes (middleware, asyncHandler, event logging), so they
went faster than planned rather than slower.

The one session that ran over was **session 4** (server-side search/filter/
sort/pagination) — 1.5h against a 1h estimate. The friction wasn't the
filtering logic itself, it was getting the pagination response contract
right (total count reflecting the whole filtered set, not just the current
page) and then actually verifying it rather than assuming it worked — the
curl tests where I paginated with a small page size and checked `total`
stayed constant across pages took longer than writing the endpoint did.

Sessions 6 through 8 came in noticeably under estimate (0.5h each against
1-1.5h budgeted). By that point the pattern for a new resource — model,
route, asyncHandler wrapper, curl verification — was established enough
from earlier sessions that new endpoints (dashboard aggregation, alerts,
the auth/queue frontend scaffold) took less back-and-forth than the first
few sessions where I was still deciding conventions.

What wasn't in the original estimate at all: the ~1h of real bug fixing
(the unexported `MONGO_URI` causing silent `mongosh` failures, the missing
`app.js` route registration behind the `/api/users` 404, the React
"setState in an effect" warning, a duplicate `update()` declaration that
was a genuine syntax error) and the ~0.5h UI polish pass. Neither was a
planning failure exactly — debugging time is inherently hard to estimate
in advance — but it's worth naming as time the original session table
didn't account for, rather than folding it invisibly into the sessions
around it.

Net result: individual sessions mostly ran at or under budget, but the
unplanned debugging and polish time meant the total landed close to what
I'd originally estimated rather than meaningfully under it — the savings
from faster-than-expected sessions were mostly absorbed by the two
unplanned categories rather than banked as slack.

## What I cut

I didn't attempt any of the stretch ideas — with the 10 required goals
plus the debugging and polish time that came up along the way, there
wasn't real budget left, and the brief is explicit that all 10 done
solidly beats 10-plus-extras done thin, so I treated the stretch list as
correctly out of scope for this pass rather than something to rush.

Within the 10 goals, a few things stayed rougher than I'd have liked given
more time:
- The bulk-reassign UI went through an intermediate `prompt()`-based
  version (asking for a raw agent ObjectId by hand) before I replaced it
  with a proper picker modal — functional the whole time, but not
  something I'd want in front of a reviewer without the fix, which I did
  make before submitting.
- The claim-from-queue flow (an agent picking up an unassigned ticket) is
  a single button with no confirmation step or undo — it works, but got
  less UX attention than the rest of the ticket-detail actions.
- I didn't build a shared source of truth for the status-transition table
  between frontend and backend — it's duplicated in two files, which I
  flagged in decisions.md as a real trade-off rather than something I
  ran out of time to notice.

None of these affect whether the 10 goals work and are server-enforced —
they're polish and structural debt I chose to accept rather than chase
further, given where the remaining time was better spent (verifying
correctness over refining UX on features that already functioned).
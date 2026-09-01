# Plan

## Session breakdown (actual order built)

| Session | Focus | Estimated | Actual |
|---|---|---|---|
| 1 | Backend scaffold, User model, JWT + refresh auth | 2h | 1h |
| 2 | Ticket/Reply/ticketEvent models, CRUD, ownership enforcement | 2h | 1h |
| 3 | Status transition engine + SLA clock pause/resume | 2h | 1h |
| 4 | Server-side search/filter/sort/pagination | 1h | 1.5h |
| 5 | Bulk reassign/close + CSV export | 1h |0.5h |
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

[FILL IN — be honest here. Likely candidates worth naming: the status-engine
session probably ran close to estimate since it was planned carefully in
advance; the frontend sessions likely ran over due to real debugging (a
missing `app.js` route registration causing a 404, an unexported shell
variable causing silent `mongosh` failures, a duplicate `update()`
declaration, a React "setState in effect" warning) that weren't in the
original time budget.]

## What I cut

Given the 12-hour guide, if time ran short, the honest priority order I'd
protect is: all 10 numbered goals, fully working and server-enforced, over
any stretch idea. [FILL IN what you actually cut, if anything — e.g. "the
bulk-reassign UI stayed a plain agent picker rather than getting the full MUI
treatment in time," or "no stretch idea was attempted," or note if you did
attempt one.]
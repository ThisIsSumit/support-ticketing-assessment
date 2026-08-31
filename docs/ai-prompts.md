# AI prompts

I used Claude (chat) as a pair-programming collaborator throughout this
build, working session-by-session rather than generating the app in bulk. I
made the architecture/schema/permission-model decisions myself in each
session before code was written, then reviewed, tested, and debugged every
change against real API calls (curl) before layering the next piece on top.

## Architecture & schema planning
- "Help me plan a support ticketing take-home assignment [pasted full brief].
  I want to use MERN. Break this into sessions and help me design the ticket
  status machine and SLA clock before writing code."
- Follow-ups deciding: reopen window duration, SLA at-risk warning window,
  JWT vs JWT+refresh auth, whether New tickets should auto-move to Open on
  assignment, fixed-enum vs free-text categories.

## Session-by-session implementation
- "Session 2 — Ticket, Reply, TicketEvent models, CRUD, ownership
  enforcement" (and similarly for sessions 3 through 10), each followed by
  me running the actual curl tests it proposed and reporting real output
  back before moving to the next session.

## Debugging — where output was wrong or needed real diagnosis
- Backdating a ticket's `createdAt` via `mongosh --eval` kept returning
  `matchedCount: 0`. Initial guesses (shell escaping) were wrong — the real
  cause was that `$MONGO_URI` was never exported in that terminal, so
  `mongosh` silently connected to a different default database (`test`
  instead of `support-ticketing`). Traced this by checking `echo $MONGO_URI`
  and comparing against `.env` directly, rather than continuing to guess at
  the update syntax.
- `GET /api/tickets` returned a bare array instead of the new
  `{tickets, total, page, pageSize}` shape after a supposed update — turned
  out nodemon hadn't actually picked up the file change; confirmed by
  checking the dev-server terminal for a restart message.
- `POST /api/tickets` crashed with `ValidationError: primaryAssigneeId is
  required` — I'd asked for `primaryAssigneeId` to become optional (to
  support "New = unassigned"), but the model file still had the old
  `required: true`. Fixed by re-checking the actual file content against
  what was intended, not assuming the edit had landed.
- `GET /api/users` 404'd from the frontend — the route file existed but was
  never registered in `app.js`. Root-caused via `grep` for the registration
  line rather than re-writing the route from scratch.
- React warned "Calling setState synchronously within an effect can trigger
  cascading renders" — fixed by moving `setLoading(true)` out of the
  data-fetching effect body and into the user-triggered `update()` handler
  instead, so the effect itself only ever sets state inside a resolved
  promise callback.
- A pasted code update introduced `update()` declared twice in the same
  component (a straight syntax error) and a checkbox column that existed in
  the header but was conditionally hidden from agent rows in the body,
  causing a column-count/alignment mismatch. Caught by reviewing the pasted
  diff line-by-line before accepting it, not by running it first.

## What I changed after reviewing AI output
- Declined the initial framing of "use multiple parallel AI accounts/agents
  to generate different parts of the app independently" as a workflow,
  since it would have meant submitting code I hadn't actually understood or
  directed — chose sequential, session-by-session collaboration instead,
  with me testing and confirming each piece before the next was built on
  top of it.
- Chose to keep MongoDB over a suggested-but-not-required switch to
  Supabase/Postgres, after weighing the actual trade-off rather than
  following a general "bigger apps use Postgres" impression (see
  decisions.md #1).
- Added the `/claim` endpoint after independently hitting a real 403 while
  testing the UI, before accepting it as "working as designed."
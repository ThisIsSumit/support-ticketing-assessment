# Architecture

## Moving pieces

- **Client** — React (Vite), single-page app, deployed on Vercel. Talks to the
  API over HTTPS. Holds the JWT access token in memory only (never
  localStorage) to limit XSS exposure; the refresh token lives in an httpOnly
  cookie the browser manages automatically.
- **Server** — Node/Express, deployed on Render. Stateless except for the
  refresh-token table; every request re-authenticates via the JWT in the
  Authorization header.
- **Database** — MongoDB (Atlas free tier in production, local Mongo in dev).
  Mongoose for schema/validation.

## How they talk to each other

Client → Server: REST over HTTPS, JSON bodies, `Authorization: Bearer <token>`
on every authenticated request, `withCredentials: true` so the refresh cookie
rides along automatically on the one route that needs it (`/auth/refresh`).

Server → Database: Mongoose ODM, single connection pool per server instance.

## Where each piece runs

- Client: Vercel (static build + CDN)
- Server: Render (single Node process, free web service tier)
- Database: MongoDB Atlas (free shared cluster)

## Request path — one representative action end to end

**"An agent adds a customer-logged reply to a Pending ticket, which flips it back to Open."**

1. Agent fills the reply form on `TicketDetail.jsx`, selects "Log what the
   customer said," submits.
2. `addReply()` (client API helper) POSTs to `/api/tickets/:id/replies` with
   `{ body, isInternal: false, authorType: 'customer' }`, access token attached.
3. Express: `requireAuth` verifies the JWT, attaches `req.user`. `loadTicket`
   fetches the ticket. `requireTicketAccess` confirms the caller is the
   assignee, a collaborator, or a supervisor — otherwise 403 before any data
   is touched.
4. Handler creates the `Reply` document, then a `TicketEvent` of type
   `reply`.
5. Because `authorType === 'customer'` and the ticket's current status is
   `Pending`, the handler calls into `applyStatusChange()` (the shared status
   engine, session 3), which validates `Pending → Open` against the
   transition table, clears `pendingSince`, adds the elapsed pending time to
   `totalPausedMs`, and sets `status: 'Open'`.
6. A second `TicketEvent` (`status_change`, `Pending → Open`) is written.
7. Response returns the new reply; the client re-fetches the ticket and
   re-renders — the SLA badge, status label, and timeline all reflect the
   change without a manual page refresh.

## What I decided not to build

- **No email ingestion.** The brief describes tickets "arriving by email,"
  but building real inbound email parsing was out of scope for 12 hours.
  Customer replies are logged manually by staff with an `authorType` flag —
  see `docs/decisions.md`.
- **No websocket/real-time push.** The alert badge and dashboard poll on an
  interval (30s) instead. Simpler, no extra infra, and the latency is
  invisible in practice for this use case.
- **No dedicated notification system** (email/Slack alerts on breach) — the
  in-app alerts page and nav badge satisfy goal 10 without it.
- **No fine-grained role beyond agent/supervisor** — the brief only asks for
  two roles; I didn't add a third "team lead" tier or per-category
  permissions.
- **No frontend route-level code splitting / lazy loading** — the app is
  small enough that a single bundle is fine; not worth the complexity for
  this scope.

## Live URLs

- Frontend: https://support-ticketing-ten.vercel.app
- Backend API: [FILL IN — Render URL]
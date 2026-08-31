# Schema

Database: MongoDB. Four collections.

## User
| Field | Type | Notes |
|---|---|---|
| email | String | unique, lowercase |
| passwordHash | String | bcrypt |
| name | String | |
| role | String enum | 'agent' \| 'supervisor' |
| createdAt/updatedAt | Date | Mongoose timestamps |

## RefreshToken
| Field | Type | Notes |
|---|---|---|
| userId | ObjectId → User | |
| tokenHash | String | SHA-256 of the raw token; raw token never stored |
| expiresAt | Date | |
| revokedAt | Date \| null | supports logout / revocation |

## Ticket
| Field | Type | Notes |
|---|---|---|
| subject, description | String | |
| requesterEmail | String | |
| priority | String enum | low/medium/high/urgent |
| category | String enum | bug/billing/how_to/feature_request/other |
| status | String enum | New/Open/Pending/Resolved/Closed |
| primaryAssigneeId | ObjectId → User \| null | null = unclaimed |
| collaboratorIds | [ObjectId → User] | see denormalization note below |
| firstResponseTargetMinutes | Number | captured once at creation from the priority table |
| pendingSince | Date \| null | set on entering Pending, cleared on leaving |
| totalPausedMs | Number | accumulates time spent in Pending |
| resolvedAt, closedAt, archivedAt, reopenedAt | Date \| null | |
| acknowledgedAlertAt | Date \| null | for SLA alert dismissal |

Indexes: text index on `{subject, description}` (search), compound index on
`{status, priority, category, primaryAssigneeId}` (filtering).

## Reply
| Field | Type | Notes |
|---|---|---|
| ticketId | ObjectId → Ticket | |
| authorId | ObjectId → User | staff member who logged it |
| authorType | String enum | 'agent' \| 'customer' — see decisions.md |
| body | String | |
| isInternal | Boolean | internal note vs customer-visible |

## TicketEvent
| Field | Type | Notes |
|---|---|---|
| ticketId | ObjectId → Ticket | |
| type | String enum | created/status_change/reassignment/reply |
| actorId | ObjectId → User | |
| fromValue, toValue | String \| null | |

No update/delete routes exist against this collection — immutability is
enforced by omission, not a database-level constraint. See decisions.md for
why, and what a stronger guarantee would require.

## Relationships

One-to-many: User → Ticket (as assignee), Ticket → Reply, Ticket → TicketEvent.
Many-to-many: Ticket ↔ User (collaborators).

## Constraints: database vs application

- **Database-enforced:** field types, required fields, enum membership
  (status/priority/category/role/authorType), uniqueness (User.email).
- **Application-enforced:** status transition legality (the New→Open→...
  graph), the 7-day reopen window, ownership-based write access
  (assignee/collaborator/supervisor), the "agent cannot reassign" rule,
  TicketEvent immutability. None of these have a natural MongoDB-native
  equivalent short of a completely different modeling approach (e.g. a
  relational DB with triggers, or Mongo schema validation rules that can't
  easily express "legal transitions depend on the current row's own state").

## Deliberate denormalization

- `collaboratorIds` is an array field on `Ticket` rather than a separate
  join collection. Collaborator lists are small (rarely more than 2-3
  people) and read far more often than written, so embedding avoids a join
  for the common case (loading a ticket) at the cost of a slightly less
  "normalized" shape. A real relational join table would be the safer
  choice if collaborator lists ever grew large or needed their own metadata
  (e.g. "added on" per collaborator).
- `firstResponseTargetMinutes` is copied onto the Ticket at creation time
  from a priority lookup table, rather than joined/looked-up live on every
  read. This means a later change to the priority-to-minutes mapping never
  silently rewrites the SLA commitment of tickets already created — a
  deliberate trade-off between "always current" and "stable history."

## What would break first at 100x the data

- **The in-memory priority sort** (`GET /tickets?sortBy=priority`) fetches
  every matching document and sorts in JS, because Mongo can't natively sort
  by an arbitrary priority-string-to-rank mapping without an aggregation
  pipeline. Fine at hundreds of rows; falls over well before 100x. Fix:
  either a `$switch`-based aggregation, or (simpler) a stored numeric
  `priorityRank` field set alongside `priority` so it's a native sort.
- **The dashboard's SLA-breach count** (`getSlaStatus` computed per-ticket in
  JS after fetching all unresolved tickets) has the same issue — it doesn't
  scale as a full-table scan-and-filter. Fix: a stored, periodically
  recomputed `currentSlaStatus` field, or a proper aggregation expressing the
  elapsed-time formula natively.
- **`$text` search** on subject/description works well for exact-ish tokens
  but doesn't do fuzzy/partial matching and doesn't scale as gracefully as a
  dedicated search index (Atlas Search, Elasticsearch) once ticket volume and
  query load both grow.
- **No pagination cursor** — offset-based pagination (`skip`/`limit`) gets
  slower as the skip value grows; a cursor-based approach (paginate by
  `_id`/`createdAt`) would hold up better at high page depths.
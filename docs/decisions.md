# Decisions

## 1. Reversed: considered switching from MongoDB to Supabase/Postgres mid-project

Midway through the backend build, I considered switching the database layer
to Supabase (Postgres) for stronger relational integrity (real foreign keys,
row-level security) given tickets/replies/events are naturally relational
data. I decided against it: the brief states explicitly that no stack scores
better than another, I was already 5 sessions into a working, tested Mongo
backend, and Supabase is a Postgres service — not a hosted-Mongo option — so
"switching" meant rewriting every model and query, not a config change. The
cost (likely 3-4+ hours of rework in a 12-hour budget) had no corresponding
score benefit. Kept MongoDB.

## 2. New tickets can be created unassigned; only a claim action (not a full
reassign) lets an agent pick one up

A ticket created with no `primaryAssigneeId` starts in `New` status,
representing "landed in the shared queue, nobody has it yet" — directly
addressing the brief's stated problem of tickets nobody can tell are or
aren't being worked. Initially, only supervisors could assign an unclaimed
ticket (via the ownership-gated actions), which meant an agent had no way to
self-serve pick up unclaimed work. I added a narrow `/claim` endpoint later
(session 9, after hitting this gap through actual testing) that lets any
agent claim an unassigned ticket for themselves — but never lets them take a
ticket that already has an owner. This keeps "agents cannot reassign a
ticket away from themselves" true by construction: agents have no code path
to change `primaryAssigneeId` on an already-owned ticket at all, only to set
themselves as owner of something nobody owns yet.

## 3. `authorType` field on Reply, standing in for a real customer channel

The brief describes "a customer reply returns the ticket to Open," but there
is no customer-facing login or email-ingestion pipeline in scope. I modeled
this as: staff log a reply and flag it `authorType: 'customer'` to represent
"this is what the customer said," while `authorId` still records which staff
member logged it, preserving an honest audit trail (the system never
pretends the customer typed it directly). When a reply with
`authorType: 'customer'` is added to a `Pending` ticket, the status engine
automatically transitions it back to `Open` and resumes the SLA clock.

## 4. In-memory priority sort — a known, named scale limitation

`GET /tickets?sortBy=priority` fetches the filtered set and sorts in
JavaScript rather than in MongoDB, because priority is a string
(`low/medium/high/urgent`) with no natural sort order Mongo understands
without an aggregation pipeline. This is fine at take-home data volumes and
would need to become a proper `$switch`-based aggregation (or a denormalized
numeric `priorityRank` field) at real scale. Documented rather than
over-engineered for a 12-hour scope — see schema.md.

## 5. TicketEvent immutability is enforced by omission, not by the database

The audit timeline (goal 9) needs to be tamper-proof, "including by
supervisors." I chose not to build any update or delete route against the
`TicketEvent` collection — so nothing in the application can modify history.
This is an honest, not an absolute, guarantee: MongoDB itself doesn't
prevent a direct database-level edit (e.g. someone with raw DB access could
still alter a document). A stronger guarantee would need something like a
capped collection, a separate write-only credential, or an external
append-only log — out of scope here, but worth being upfront that "no route
exists to do it" and "the database physically cannot do it" are different
claims, and I only have the former.

## 6. Editing a ticket's priority does not recompute its SLA target

`firstResponseTargetMinutes` is captured once at creation (decision, see
schema.md denormalization note) so a later change to the priority table
doesn't retroactively rewrite an SLA commitment already made. This has a
real consequence: if an agent edits a ticket from `low` to `urgent` priority
after creation, the SLA clock continues running against the original,
looser target rather than tightening immediately. I decided this is
defensible (you don't retroactively shrink an SLA window you already
implicitly promised) rather than a bug, but it's a genuine edge case I'm
flagging rather than one I'm confident is the only reasonable choice —
recomputing on priority-edit would be an equally defensible alternative.

## 7. Reopen window set to 7 days — provisional default, not derived from the
brief

The brief specifies "a fixed window" for reopening a Closed ticket without
naming a duration. I set 7 days as a reasonable default and moved forward
rather than blocking progress on an unspecified number, flagging it here as
a placeholder choice rather than a researched one.
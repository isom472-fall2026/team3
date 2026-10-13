# Phase 2 delivery note
 
*The Phase Lead for phase 2 writes this note, during phase 2 — not afterwards, and not by
whoever is free at the end.*
 
## 1. What was decided
 
Students and staff at Kuwait University check where a bus is, which stops it serves and when
it will arrive. Transportation staff watch trips and delays. During a trip, the driver's
phone sends the bus's location, and the system records arrivals and delays by itself by
checking each location against the stop's geofence.
 
**Personas (four):** Sara the student passenger, Fatima the staff passenger, Ahmed the bus
driver, and Noura the transportation coordinator.
 
**Ten tables:** `buses`, `stops`, `routes`, `routes_stops`, `schedules`,
`scheduled_stop_times`, `trips`, `bus_locations`, `trip_stop_updates`, `delay_logs`.
 
**Row level security is on for all ten tables:**
- Only signed-in users with a confirmed `@ku.edu.kw` email, or a driver account, can read.
  Anonymous visitors see nothing.
- A driver can start and update trips for their own bus, and add locations to that bus's
  trips.
- Students can't write anything.
- Arrivals, departures and delays are written by a database trigger, not by any user.
 
## 2. Who did what
 
| Name | Wrote | Assigned to build (Phase 3) |
|---|---|---|
| Ayah Reda (Quality Lead, Phase 2 Lead) | #33 #34 | #33 (#34 built in Phase 2) |
| Zeinab Mohammed Sharif (Design Lead) | #48 #49 | #48 |
| Sara Alshamsi (Data Lead) | #45 #46 | #46 (#45 built in Phase 2) |
| Abdulrahman Alyaseen (Build Lead) | #31 #32 #40 #53 #57 #58 #59 #60 | #31 #32 #59 #60 (#40 #53 #57 #58 built in Phase 2) |
| Roqaya Aldurai (FinOps Lead) | #35 #36 | #35 #36 |
| Jumana Shams (Client Lead) | #29 #30 | #29 #30 |
 
## 3. Where everything is
 
| Deliverable | Where it is |
|---|---|
| Personas | [docs/personas.md](../personas.md) |
| Stories with acceptance criteria | The Issues tab: https://github.com/isom472-fall2026/team3/issues |
| The split | The Assignee on every story issue, on the board: https://github.com/orgs/isom472-fall2026/projects/4 |
| Boundaries between members | The acceptance criteria of the stories that share data, in the Issues tab: https://github.com/isom472-fall2026/team3/issues |
| Schema — the SQL | [db/schema.sql](../../db/schema.sql) |
| Schema — the document | [docs/schema.md](../schema.md) (ERD: [docs/The final ERD.png](<../The final ERD.png>)) |
| Backlog copy | [docs/backlog.md](../backlog.md#phase-2--saved-7-october), "Phase 2" section |
| Token plan and first ledger entry | [docs/finops-ledger.md](../finops-ledger.md), ["The plan"](../finops-ledger.md#the-plan--written-in-phase-2) and ["Phase 2"](../finops-ledger.md#phase-2) sections |
| Environment | Each member's commits on `main` this phase: https://github.com/isom472-fall2026/team3/commits/main |
| Delivery note | [docs/delivery-notes/phase-2.md](phase-2.md) |
| Tag | [`phase-2`](https://github.com/isom472-fall2026/team3/releases/tag/phase-2) |
 
## 4. The tag
 
`phase-2`, created by Ayah Reda after pull request #76
 
## 5. Not finished, and where it went
 
- **First in Phase 3:** the driver stories #59 and #60, because the map, arrival and delay
  stories depend on them.
- **First fix in Phase 3:** #46 (stop search). The stops load, but the search box and the
  filtering are not on the page yet.
- **Moved to Phase 3:** a possible bug in #34 (weekly trip history).
- **Dropped:** #49 (English/Arabic switch).
- **Replaced:** the proposal's "no driver interface". Drivers now sign in to start a trip.

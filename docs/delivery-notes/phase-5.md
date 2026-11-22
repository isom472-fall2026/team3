# Phase 5 delivery note
*The Phase Lead for phase 5 writes this note, during phase 5 — not afterwards, and not by
whoever is free at the end.*
## What was delivered
During Phase 5, our team gave students arrival times and trip progress for their bus, and gave transportation staff a Dashboard that answers our analytics question. All 12 sprint stories are merged and on the running site.
Students can now see when the next buses are expected at a stop, with the timetable time plus the latest delay, "Running late" or "Trip cancelled" (#32). Tapping a running bus on the map shows which stops it has reached and at what time (#100), and when it is expected at each stop still ahead (#187). Students can find the stop nearest to them and open it on the map (#78), see whether today's departures have already left (#188), and see how long the trip usually takes at each departure (#192).
Transportation staff can now put a route's stops in order (#90) and set the expected arrival time at each stop for a departure (#97), which the arrival estimates and delay flags depend on. Staff can also see today's departures that have not started 10 minutes after their time (#108). Students don't see these staff pages.
For the Phase 5 analytics requirement, our question was "How long does each route really take, and at what time of day is it slowest?" The Transportation Department plans its timetable from planned times only and has no record of how long trips really take. The new staff-only Dashboard tab answers it from completed trips: the real trip time at each departure against the planned time (#189), the three slowest departures at a glance (#190), and a realistic planned time for each departure, the time 85% of trips finish within (#191). Because our client no longer replies, each of these stories has a business justification instead of the client's request. Every story this phase also has a usage log in `docs/usage/` and a row in the finops ledger, and the ledger now looks back at whether our Phase 2 plan held.
## Who did what
| Name | Stories |
|---|---|
| Roqaya Aldurai (Phase Lead, Finops Lead) | #188, #191 |
| Abdulrahman Alyaseen (Build Lead) | #32, #187 |
| Sara Alshamsi (Data Lead) | #78, #190 |
| Zeinab Mohammed Sharif (Design Lead) | #90, #97 |
| Jumana Shams (Client Lead) | #189, #100 |
| Ayah Reda (Quality Lead) | #108, #192 |
## Links to the stories
*The full story list at this tag is saved in ../backlog.md — do not repeat it here.*
- [#32](https://github.com/isom472-fall2026/team3/issues/32) — Student can view estimated arrival time at a stop
- [#187](https://github.com/isom472-fall2026/team3/issues/187) — Student sees when a running bus will reach each of its next stops
- [#78](https://github.com/isom472-fall2026/team3/issues/78) — Student sees the nearest stop to them
- [#190](https://github.com/isom472-fall2026/team3/issues/190) — Transportation coordinator sees the three slowest departures at a glance
- [#90](https://github.com/isom472-fall2026/team3/issues/90) — Transportation coordinator puts stops on a route in order
- [#97](https://github.com/isom472-fall2026/team3/issues/97) — Staff sets each stop's expected time on a departure
- [#189](https://github.com/isom472-fall2026/team3/issues/189) — Transportation coordinator sees how long each route really takes at each departure time
- [#100](https://github.com/isom472-fall2026/team3/issues/100) — Student sees which stops a bus has reached
- [#188](https://github.com/isom472-fall2026/team3/issues/188) — Student sees whether today's departures have already left
- [#191](https://github.com/isom472-fall2026/team3/issues/191) — Transportation coordinator suggests a realistic planned time for a departure
- [#108](https://github.com/isom472-fall2026/team3/issues/108) — Transportation coordinator sees today's departures that never started
- [#192](https://github.com/isom472-fall2026/team3/issues/192) — Student sees how long a trip usually takes at their departure time
## The tag cut for this phase
phase-5 after pull request #213 by the phase lead Roqaya Aldurai
## Anything not finished, and where it went
- **#81 A trip finishes automatically at its last stop — moved to Phase 6.** It was moved to Phase 5 in the Phase 4 note but was not built; Sara builds it in Phase 6.
- **13 stories planned for Phase 6.** #81, #77, #83, #85, #88, #119, #101, #102, #103, #91, #92, #109 and #111, each with its owner in `docs/backlog.md`.
- **Client approval for the scope changes (#105, #106, #57, #58, #131) — replaced.** The client never replied. Following the Phase 4 feedback, each story now has a business justification in `docs/scope-changes.md` instead.
- **Trip times page — moved.** It was first built as "Insights" under Trips and moved to its own staff-only Dashboard tab, so the Phase 5 analytics (#189, #190, #191, #108) are in one place.
- **Two small follow-ups for Phase 6.** In the bus popup (#100), one failed refresh leaves "Trip details unavailable" until the popup is reopened, and `WeeklyTripHistory.jsx` (#34) has 3 lint errors.

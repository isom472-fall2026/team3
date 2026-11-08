# Phase 4 delivery note

*The Phase Lead for phase 4 writes this note, during phase 4 — not afterwards, and not by
whoever is free at the end.*

## What was delivered

During Phase 4, our team built the tools transportation staff need to manage the service and gave students more ways to find their bus on the map. All 12 sprint stories are merged and on the running site.

Transportation staff can now add a new route (#89) and a new stop (#96), change a bus's status to active, maintenance or out of service (#117), and cancel a trip that will not run (#116). A cancelled trip's bus leaves the student map, and a bus that is not active can no longer be given a trip. Staff can also see any bus that has stopped sending its location (#110). Students don't see these staff pages.

Students can now filter the live map to one route (#98), see a route drawn on the map with its stops in order (#121), and open a stop on the map with its arrival area around it (#107). Visitors without a KU account can continue as a guest and see routes, stops and live buses, without arrival times or delays (#131).

For testing, staff can run a test bus that plays back locations along a trip's route (#106). With it we verified that a bus's arrival at a stop is recorded automatically (#79) and that a late arrival is recorded as a delay (#80). We also fixed the two bugs from the Phase 3 feedback, direct links that showed GitHub's 404 page (#151) and adding a departure with no success message (#152), and a third bug where the staff menu tabs spilled outside their box (#175). The README now lists a confirmed student and staff test account.

## Who did what

| Name | Stories |
|---|---|
| Zeinab Mohammed Sharif (Phase Lead, Design Lead) | #89, #96 |
| Abdulrahman Alyaseen (Build Lead) | #106, #131, #151 and #175 (bugs fixed) |
| Sara Alshamsi (Data Lead) | #79, #80, #152 (bug fixed) |
| Jumana Shams (Client Lead) | #98, #121 |
| Ayah Reda (Quality Lead) | #107, #116 |
| Roqaya Aldurai (Finops Lead) | #110, #117 |

## Links to the stories

*The full story list at this tag is saved in ../backlog.md — do not repeat it here.*

- [#89](https://github.com/isom472-fall2026/team3/issues/89) — Transportation coordinator adds a route
- [#96](https://github.com/isom472-fall2026/team3/issues/96) — Transportation coordinator adds a stop
- [#106](https://github.com/isom472-fall2026/team3/issues/106) — A test bus plays back fake locations along its route
- [#131](https://github.com/isom472-fall2026/team3/issues/131) — Visitor continues as a guest without a KU account
- [#79](https://github.com/isom472-fall2026/team3/issues/79) — A bus's arrival at a stop is recorded automatically
- [#80](https://github.com/isom472-fall2026/team3/issues/80) — A late arrival is recorded as a delay automatically
- [#98](https://github.com/isom472-fall2026/team3/issues/98) — Student filters active buses by route
- [#121](https://github.com/isom472-fall2026/team3/issues/121) — Student sees a route drawn on the map
- [#107](https://github.com/isom472-fall2026/team3/issues/107) — Student sees a stop on the map
- [#116](https://github.com/isom472-fall2026/team3/issues/116) — Transportation coordinator cancels a trip
- [#110](https://github.com/isom472-fall2026/team3/issues/110) — Transportation coordinator sees buses that stopped sending their location
- [#117](https://github.com/isom472-fall2026/team3/issues/117) — Staff changes a bus's status

## The tag cut for this phase

phase-4 after pull request #177 by the phase lead Zeinab Mohammed Sharif

## Anything not finished, and where it went

- **#116 Coordinator cancels a trip — criteria changed.** The "Cancel trip" button was planned for the running-trips page (#83), which is in Phase 5. Jumana changed the criteria on 7 Nov so the button is on the Start a trip page, and the "Trip cancelled" label on the schedule moved to #32 in Phase 5.
- **#81 A trip finishes automatically at its last stop — moved to Phase 5.** It will be verified with the test bus (#106).
- **Client approval for the scope changes (#105, #106, #57, #58, #131) — still pending.** Jumana asked Ms. Abeer by WhatsApp on 25 Oct and the request is logged in `docs/scope-changes.md`. Her answer will be added when she replies.
- **Redesign to prototype v2 — planned for Phase 5.** Each part will be its own enhancement issue.

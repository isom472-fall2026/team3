# Phase 3 delivery note

*The Phase Lead for phase 3 writes this note, during phase 3 — not afterwards, and not by
whoever is free at the end.*

## What was delivered

During Phase 3, our team built the main student and staff features of the KU Bus Tracking System. All 13 sprint stories are merged and on the running site.

Transportation staff can now start today's trips by choosing a bus for each departure (#105), and add new departures to a route (#118). Students don't see these staff pages.

Students can follow the buses on a live campus map, with On campus and Off campus views (#31). Each bus moves within 5 seconds of a new location. Tapping a bus shows its route, next stop and scheduled time (#48). Students can also see when a bus's location was last updated and whether it may be out of date (#36), and the bus number, plate and status for an active trip (#35).

For planning a trip, students can see a route's stops in order (#29) and where each route starts and ends (#84). They can look up a route's departure times and days (#33), see which of today's departures are cancelled (#120), and check a trip's latest delay (#30). We also fixed two Phase 2 bugs: stop search by name or area (#46), and routes with missing operating hours (#53).


## Who did what

| Name | Stories |
|---|---|
| Abdulrahman Alyaseen (Phase Lead, Build Lead) | #105, #31, #53 (bug fixed) |
| Sara Alshamsi (Data Lead) | #46 (bug fixed), #118 |
| Jumana Shams (Client Lead) | #29, #30 |
| Ayah Reda (Quality Lead) | #33, #84 |
| Roqaya Aldurai (Finops Lead) | #35, #36 |
| Zeinab Mohammed Sharif (Design Lead) | #48, #120 |

## Links to the stories

*The full story list at this tag is saved in ../backlog.md — do not repeat it here.*

- [#105](https://github.com/isom472-fall2026/team3/issues/105) — Transportation coordinator starts a trip for a bus
- [#31](https://github.com/isom472-fall2026/team3/issues/31) — Student can view active buses on the campus map
- [#53](https://github.com/isom472-fall2026/team3/issues/53) — Student can view route operating hours
- [#46](https://github.com/isom472-fall2026/team3/issues/46) — Student can search for a stop by name or area
- [#118](https://github.com/isom472-fall2026/team3/issues/118) — Staff adds a departure to a route
- [#29](https://github.com/isom472-fall2026/team3/issues/29) — Student can view stops for a bus route
- [#30](https://github.com/isom472-fall2026/team3/issues/30) — Student can view bus delay information
- [#33](https://github.com/isom472-fall2026/team3/issues/33) — Bus Route Schedule Lookup (Student View)
- [#84](https://github.com/isom472-fall2026/team3/issues/84) — Student sees where a route starts and ends
- [#35](https://github.com/isom472-fall2026/team3/issues/35) — Student can view bus information for an active trip
- [#36](https://github.com/isom472-fall2026/team3/issues/36) — Student can view when the bus location was last updated
- [#48](https://github.com/isom472-fall2026/team3/issues/48) — Student can tap a bus marker on the map to view trip details
- [#120](https://github.com/isom472-fall2026/team3/issues/120) — Student sees cancelled departures on the schedule

## The tag cut for this phase

phase-3 after pull request #148 by the phase lead Abdulrahman Alyaseen

## Anything not finished, and where it went

- **#59 Driver starts a trip and #60 Driver location sharing — replaced.** The team replaced the driver role with transportation staff. The same work is now #105 (staff start a trip, delivered this phase) and #106 (a test bus plays back locations, moved to Phase 4).
- **#106 Test bus plays back fake locations — moved to Phase 4.** Until it exists, the live map, delays and last-update pages are tested by adding rows to the database by hand.
- **#79 Arrival at a stop recorded automatically, #80 Late arrival recorded as a delay and #81 Trip finishes at its last stop — moved to Phase 4.** The database trigger already does all three, but the pull requests opened for #80 and #81 did not implement or verify the stories, so they were closed and the stories reopened. They will be verified with #106 and the seed data.
- **Client approval for the scope changes (#105, #106, #57, #58, #131) — pending.** Jumana asked Ms. Abeer by WhatsApp on 25 Oct and the request is logged in `docs/scope-changes.md`. Her answer will be added in Phase 4.


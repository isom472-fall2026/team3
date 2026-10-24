# Phase 3 delivery note

*The Phase Lead for phase 3 writes this note, during phase 3 — not afterwards, and not by
whoever is free at the end.*

## What was delivered

- **Transportation staff can start today's trips.** A staff account sees a "Start a trip" page listing today's departures for active routes, earliest first. Staff choose an active bus and press Start. The page refuses a missing bus ("Choose a bus.") and a bus already on a trip ("Bus X is already on a trip."), and shows "Started" or "Finished" for departures that already ran. Students don't see the page, and the database refuses their inserts.
- **Students can see running buses on a live campus map.** The "Live map" page shows the Shadadiya campus (On campus) or the wider area (Off campus). Each bus on an active trip today is a marker with its bus number. It moves within 5 seconds of a new position without reloading, and greys out with "Last updated HH:MM" when its position is over 2 minutes old. Buses with no position are listed as "Location not available".
- **Route operating hours are clearer.** A route whose hours are empty, only spaces, or contain no time (e.g. "TBD") now shows "Operating hours not available".
- **Students can search for a stop by name or area.** The "Stops" page filters the list as they type, sorted alphabetically, and shows "No stops match" when nothing matches.
- **Staff can add a departure to a route.** <Sara: one line once #129 is merged>
- <Jumana: what a user can now do with #29 and #30>
- <Ayah: what a user can now do with #33 and #84>
- <Roqaya: what a user can now do with #35 and #36>
- <Zeinab: what a user can now do with #48 and #120>

## Who did what

| Name | Stories |
|---|---|
| Abdulrahman Alyaseen (Phase Lead, Build Lead) | #105, #31, #53 (bug fixed) |
| Sara Alshamsi (Data Lead) | #46, #118 |
| Jumana Shams (Client Lead) |  |
| Ayah Reda (Quality Lead) |  |
| Roqaya Aldurai (Finops Lead) |  |
| Zeinab Mohammed Sharif (Design Lead) |  |

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

phase-3

## Anything not finished, and where it went

- **#59 Driver starts a trip and #60 Driver location sharing — replaced.** The team replaced the driver role with transportation staff. The same work is now #105 (staff start a trip, delivered this phase) and #106 (a test bus plays back locations, moved to Phase 4).
- **#80 Late arrival recorded as a delay and #81 Trip finishes at its last stop — moved to Phase 4.** The database trigger already does both, but the pull requests opened for them did not implement or verify the stories, so they were closed and the stories reopened. They will be verified with test data once #106 and the seed data exist.
- **#79 Arrival at a stop recorded automatically — moved to Phase 4**, for the same reason.
- **#106 Test bus plays back fake locations — moved to Phase 4.** It needs #105 and #31 merged first.

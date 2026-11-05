# Phase 4 delivery note

*The Phase Lead for phase 4 writes this note, during phase 4 — not afterwards, and not by
whoever is free at the end.*

<!-- DRAFT — written on 5 Nov, before any Phase 4 story was merged. Before the tag:
     1. Delete every sentence about a story that did not merge, and move it to the last section.
     2. Check each sentence against the running site, not against the issue.
     3. Fill in every ___ and delete these comments. -->

## What was delivered

During Phase 4, our team built the tools transportation staff need to manage the service, gave students more ways to find their bus on the map, and fixed the two problems the professor found in Phase 3. All ___ sprint stories are merged and on the running site.

Transportation staff can now add a new route with its service type and operating hours (#89), and add a new stop with its location and arrival radius (#96). They can change a bus's status to active, maintenance or out of service (#117), and a bus that is not active can no longer be given a trip. Staff can cancel a trip that will not run (#116), and the bus then leaves the student map. A list shows any bus that has stopped sending its location (#110), so staff can follow up. Students don't see any of these staff tools.

Students can now filter the live map to one route (#98), see each route drawn on the map (#121), and open any stop from the stop search on the map with its arrival area around it (#107). Visitors without a KU account can continue as a guest and see routes, stops and live buses (#131).

For testing, a test bus now plays back locations along its route (#106), so the live map, delays and last-update pages can be checked without adding rows by hand. With it we verified that a bus's arrival at a stop is recorded automatically (#79) and that a late arrival is recorded as a delay (#80).

We also fixed the two problems from the Phase 3 feedback. Opening a direct address such as `/team3/routes` now opens that page instead of GitHub's 404 page (#151). Adding a departure now shows a success message, appears on the schedule straight away, and shows a plain message instead of a database error when it fails (#152).

The Design Lead added a second prototype (`prototype/v2.html`) with every screen for Phases 4–6 and the loading, empty and error patterns each page should follow (#150). The README now lists a confirmed test account for each persona, so every story can be tested without a KU mailbox.

## Who did what

| Name | Stories |
|---|---|
| Zeinab Mohammed Sharif (Phase Lead, Design Lead) | #89, #96, prototype v2 (#150) |
| Abdulrahman Alyaseen (Build Lead) | #106, #131, #151 (bug fixed) |
| Sara Alshamsi (Data Lead) | #79, #80, #152 (bug fixed) |
| Jumana Shams (Client Lead) | #98, #121 |
| Ayah Reda (Quality Lead) | #107, #116, bugs #151 and #152 filed |
| Roqaya Aldurai (FinOps Lead) | #110, #117 |

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
- [#151](https://github.com/isom472-fall2026/team3/issues/151) — Bug: refreshing a page or opening a direct link shows a GitHub 404
- [#152](https://github.com/isom472-fall2026/team3/issues/152) — Bug: adding a departure shows no success message, does not update the schedule, and can show a raw database error

## The tag cut for this phase

phase-4 after pull request #___ by the phase lead Zeinab Mohammed Sharif

## Anything not finished, and where it went

- **#116 Coordinator cancels a trip — ___.** Its criteria put the "Cancel trip" button on the running-trips page from #83, which is planned for Phase 5, and expect #32 to show "Trip cancelled". <!-- Choose one and delete the other: -->
  - *Changed:* Jumana changed the criteria on ___ so the button is on the Start a trip page and the #32 part waits for #32 in Phase 5. Delivered this phase.
  - *Moved to Phase 5:* it will be built with #83.
- **#81 A trip finishes automatically at its last stop — moved to Phase 5** as planned in the Phase 3 backlog. It will be verified with #106.
- **Client approval for the scope changes (#105, #106, #57, #58, #131) — ___.** Jumana asked Ms. Abeer by WhatsApp on 25 Oct. <!-- Either: "She agreed on ___; her answer is posted on #105 and logged in docs/scope-changes.md." Or: "Still not answered at this tag; Jumana followed up on ___." -->
- **Site-wide redesign to prototype v2 — planned for Phase 5.** It touches every page, so it waits until the Phase 4 stories are merged. Each part will be its own enhancement issue.

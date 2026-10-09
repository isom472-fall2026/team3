# Phase 2 delivery note

*The Phase Lead for phase 2 writes this note, during phase 2 — not afterwards, and not by
whoever is free at the end.*

## What was delivered

<!-- What works now that did not work at the start of the phase. Plain language, what a
     user can do. Not a list of commits. -->
What was delivered

During Phase 2, the team completed the main design and planning work for the KU Bus Tracking System. We created the project backlog and wrote acceptance criteria for each user story, so every feature has a clear definition of done. We defined the database schema and the relationships between its entities and set it up in Supabase with row level security enabled. We prepared user personas and prototype screens, informed by interviews with Abeer, who gave us insight into how the system would be used. We verified the development environment by setting up the React application with Supabase. Finally, we documented the FinOps token plan and the request ledger so that resource usage can be tracked from the start. The team now has a clear, well-documented structure for building the system in the next phase (Phase 3).

Team contributions

Jumana Shams (Client Lead) wrote the user stories and the personas (docs/personas.md), and she owned the project backlog. She also took part in the stakeholder interviews that shaped the personas. 

Sara Alshamsi (Data Lead) designed the database schema, including the entities and the relationships between them. She implemented it in Supabase with row level security enabled (docs/db/schema.sql, docs/schema.md).

Roqaya Aldurai (FinOps Lead) wrote the token plan and maintained the request ledger in docs/finops-ledger.md. This gives the team a record of how resources are planned and used. 

Zeinab Mohammed Sharif (Design Lead) worked on the design side of the project, including the prototype screens, which turn the personas and user stories into concrete interface layouts. 

Ayah Reda (Quality Lead and Phase 2 Lead) led the phase and merged the team’s contributions into one consistent set of documents. She worked with the team on the backlog and acceptance criteria, and wrote this delivery note. She also built #34 ahead of Sprint 1. 

Abdulrahman Alyaseen (Build Lead) set up the React application with Supabase and verified that the development environment works for the whole team. He also built #40 and #53 ahead of Sprint 1. 
## Who did what

<!-- One line per team member: name, then the stories they built. Everybody appears. -->

| Name | Stories | Assigned to build |
|---|---|---|
| Ayah (Quilty lead, Phase 2 lead) | #33 #34 | #33 |
| Zeinab (Design Lead) | #48 #49| -- |
| Sara (Data Lead)|#45 #46 | -- |
| Abdulrahman (Build Lead)| #31 #32 #40 #53 | #31 #32 |
| Roqaya (FinOps Lead)| #35 #36 | -- |
| Jumana (Client lead) |#30 #29 | -- |


## Links to the stories
- [#33](https://github.com/isom472-fall2026/team3/issues/33) Bus Route Schedule Lookup (Student View)
- [#34](https://github.com/isom472-fall2026/team3/issues/34) Weekly Trip History
- [#48](https://github.com/isom472-fall2026/team3/issues/48) Student can tap a bus marker on the map to view trip details
- [#49](https://github.com/isom472-fall2026/team3/issues/49) Student can switch between English and Arabic interfaces
- [#45](https://github.com/isom472-fall2026/team3/issues/45) Student can switch between on-campus and off-campus routes
- [#46](https://github.com/isom472-fall2026/team3/issues/46) Student can search for a stop by name or area As a student
- [#31](https://github.com/isom472-fall2026/team3/issues/31) Student can view active buses on the campus map
- [#32](https://github.com/isom472-fall2026/team3/issues/32) Student can view estimated arrival time at a stop
- [#40](https://github.com/isom472-fall2026/team3/issues/40) Student can sign up with their KU email
- [#53](https://github.com/isom472-fall2026/team3/issues/53) Student can view route operating hours
- [#35](https://github.com/isom472-fall2026/team3/issues/35) Student can view bus information for an active trip
- [#36](https://github.com/isom472-fall2026/team3/issues/36) Student can view when the bus location was last updated
- [#30](https://github.com/isom472-fall2026/team3/issues/30) Student can view bus delay information
- [#29](https://github.com/isom472-fall2026/team3/issues/29) Student can view stops for a bus route 


*The full story list at this tag is saved in ../backlog.md — do not repeat it here.*

<!-- Link each story listed above to its issue. -->

- #__ —

## The tag cut for this phase

`phase-2`

<!-- Created by the Phase Lead — steps in ../how-we-work.md#how-to-create-the-tag. The tag is what gets graded — anything pushed after it does not
     count for this phase. -->

## Anything not finished, and where it went
Not finished, and where it went

The full system was not expected to be completed in Phase 2, because this phase focused on design and preparation. The team concentrated on getting the design and the app foundation ready, so most stories were prepared and moved to Ready rather than fully implemented.

Stories with acceptance criteria. The floor for Phase 2 is 48 stories, and we reached 18 stories with acceptance criteria. Ten more stories are opened as #29 to #60 but do not have criteria yet. Writing the criteria for these ten is the Client Lead’s first job in Phase 3.

Implemented stories. Three of the 18 stories were implemented in this phase (#34, #40 and #53). Story #34 has a potential bug, which we will investigate and fix in the next phase(Phase 3).

Stories moved forward. The remaining 15 stories were not implemented in this phase. They are Ready and moved to Sprint 1, where they will be implemented and tested. Any backlog stories not yet selected for implementation stay in docs/backlog.md and on the GitHub project board for later phases.

Stories and features moved or dropped.

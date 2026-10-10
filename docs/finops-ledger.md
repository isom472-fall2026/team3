# FinOps ledger

What the AI work cost you, and what you changed because of it.

This ledger lives in the repository and is committed. It is never kept in a spreadsheet, a
chat thread, or anywhere else. It is checked as **present and current** — it is not scored
on how accurate the numbers are. An honest rough figure beats a precise invented one.

The FinOps Lead keeps it. Every member supplies their own rows.

## The plan — written in Phase 2

*Which assistant or model you use for which kind of work, and what your limit is. Three or
four lines. Revisit it in Phase 4 and say whether it held.*

| Kind of work | What we use | Why |
| --- | --- | --- |
| Writing proposals, brainstorming, & summaries | Gemini / ChatGPT | Free, fast, and good for non-coding text tasks. |
| Coding, project setup, & direct file edits | Antigravity | Edits files directly in the repository. |
| Complex code analysis & technical documentation. we will also work on the schema | Cloude | Excellent reasoning and handling large context windows. |

Our limit: <!The free tier. If we hit it, we stop and tell the team.

## Phase 2

| Story | Assistant used | What it used (tokens, requests, or your own estimate) | What we gave it (files, story, schema) | What we would do differently |
|---|---|---|---|---|
| [#40](https://github.com/isom472-fall2026/team3/issues/40) — Student can sign up with their KU email | Antigravity Gemini Model | About 3 requests (which used all of my model usage for this week) | The full user story and acceptance criteria, the existing React app files in `/app`, the Supabase setup, and the SQL schema in `/db`. Antigravity analyzed the existing project and edited multiple files to implement the story. | Give Antigravity a narrower task per request and review each set of file changes before continuing, instead of letting one run analyze and modify several parts of the project at once. |
| [#53](https://github.com/isom472-fall2026/team3/issues/53) — Student can view route operating hours | Antigravity Claude Model | 3 requests/prompts to complete the whole story | The user story and acceptance criteria, relevant React/Vite files, and the `routes` table structure | Paste the issue text directly into Antigravity, avoid broad repository searches, and stop each run once the acceptance criteria are satisfied. |
| [#34](https://github.com/isom472-fall2026/team3/issues/34) — Admin can view weekly trip history | Antigravity (Google) | About 3 requests | The full issue acceptance criteria, the existing React app in `/app`, the Supabase schema in `docs/schema.md`, and the existing `BusPages.jsx` and `App.css` files. Antigravity created `WeeklyTripHistory.jsx`, extended `BusPages.jsx` with tab navigation, and added the dashboard CSS to `App.css`. | Break the task into smaller steps: one request for the Supabase query and data logic, a separate request for the UI and table layout, so each set of changes can be reviewed before continuing. |
| [#57](https://github.com/isom472-fall2026/team3/issues/57) — Student sees the KU logo on every page | Claude (claude-opus-5-5) | 14 requests for the build (about 6 more to choose the logo and write the story) | The story and acceptance criteria, the official KU logo image, and the React files in `/app` (App.jsx, App.css, SignIn.jsx, SignUp.jsx, index.html) | Close files in the editor before the assistant writes to them; one change was overwritten by an unsaved editor copy and had to be redone. |


## Phase 3

| Story | Assistant used | What it used (tokens, requests, or your own estimate) | What we gave it (files, story, schema) | What we would do differently |
|---|---|---|---|---|
|  |  |  |  |  |

## Phase 4

| Story | Assistant used | What it used (tokens, requests, or your own estimate) | What we gave it (files, story, schema) | What we would do differently |
|---|---|---|---|---|
|  |  |  |  |  |

## Phase 5

| Story | Assistant used | What it used (tokens, requests, or your own estimate) | What we gave it (files, story, schema) | What we would do differently |
|---|---|---|---|---|
|  |  |  |  |  |

## Phase 6

| Story | Assistant used | What it used (tokens, requests, or your own estimate) | What we gave it (files, story, schema) | What we would do differently |
|---|---|---|---|---|
|  |  |  |  |  |

# What we learned in Phase 3: reviews that push back, pages that scale, and a map that moves

*Team 3 — KU Bus Tracking System*

*Written for the ISOM 472 blog challenge. Feedback welcome.*

This phase our team learned three things we had never used before: GitHub's **Request changes** review, **React Router**, and **Leaflet** for maps. Each one solved a real problem we ran into.

---

## 1. "Request changes": a review that can say "not yet"

At the start, we thought a code review meant reading the pull request and clicking Approve. On GitHub, a review can end in one of three ways:

- **Comment**: a note, with no decision.
- **Approve**: this is ready to merge.
- **Request changes**: this is not ready yet, and here is why.

We used Request changes a lot this phase, and it caught real problems before they reached `main`:

- One pull request looked fine in the browser, but `npm run build` failed. A merge with `main` had deleted the end of a CSS block. Merging it would have broken our live website.
- Another pull request did only 1 of its story's 7 acceptance criteria, even though the story looked finished.

We also learned to use **suggestions**. Instead of writing "line 1233 is wrong", the reviewer writes the corrected code in a `suggestion` block. The author clicks **Commit suggestion**, and the fix goes straight onto their branch. That saved us a lot of back and forth.

**What we learned:** a good review checks the pull request against every acceptance criterion and runs the build. It doesn't just look at the screen. Request changes isn't rude. It protects the whole team's work.

---

## 2. React Router: one page per file

In Phase 2, all our signed-in screens lived in one big file. Six of us editing the same file meant merge conflicts in almost every pull request.

So we installed React Router:

    npm install react-router

and split the app so that **every page is its own file** in `app/src/pages/`. One list in `pages/index.js` builds the menu:

    { path: 'map', label: 'Live map', component: MapPage },

Now each of us adds a page with one new file plus one line, and we rarely get in each other's way. A flag, `staffOnly: true`, hides staff pages like "Start a trip" from students.

One surprise: our site runs on GitHub Pages, which only serves real files. A normal address like `/team3/routes` returns "404 Not Found" when you refresh it. Using **HashRouter** (`/team3/#/routes`) keeps every page on the same `index.html`, so refreshing always works.

**What we learned:** how you organise the code decides how well a team can work on it at the same time.

---

## 3. Leaflet: the start of a live bus map

For our live map story (#31), students need to see the running buses on a map of Kuwait University. We used **Leaflet** with **OpenStreetMap**:

    npm install leaflet react-leaflet

It's free and needs no API key. A map is a `MapContainer` with a `TileLayer` for the map images and a `Marker` for each bus. Each marker shows its bus number.

What works so far:

- The page shows two views, **On campus** (the Shadadiya campus) and **Off campus** (the wider area).
- Each running bus appears at its newest position from the `bus_locations` table.
- **Supabase Realtime** sends new positions to the page, so a marker moves without reloading. If Realtime can't connect, the page asks again every 5 seconds.
- A position older than 2 minutes turns grey with "Last updated HH:MM", and a position outside Kuwait isn't drawn at all.

So far we've tested it by adding positions to the database by hand. It isn't fully finished yet. Next phase we're adding a **test bus** that sends locations along a route by itself, so the map moves like a real bus, and **tapping a marker** to see that trip's details.

**What we learned:** a map is easy to draw. The hard part is deciding what to show when the data is late, missing, or wrong.

---

## Tips you can use in your own project

1. **Review against the acceptance criteria, and run the build.** Use Request changes when something isn't there yet.
2. **One page per file.** It keeps a whole team out of each other's way.
3. **Plan for bad data.** Missing, late and wrong values need their own message on the screen.
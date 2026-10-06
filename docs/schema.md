KUbus: what the schema means


Tables (one row is...)
- buses: one physical bus the university runs, identified by its bus number and plate, and linked to its driver's account.
- stops: one place where a bus picks up or drops off riders, with its coordinates and geofence radius.
- routes: one named bus line, with its operating hours, whether it is on-campus or off-campus, and whether it is currently running.
- routes_stops: one stop's place on one route: its position in the order and its planned time offset.
- schedules: one planned departure of a route and the days of the week it runs.
- scheduled_stop_times: the expected arrival and departure time at one stop on one scheduled departure.
- trips: one real run of a bus on a given date, started from a schedule, with its status and its actual start and finish.
- bus_locations: one GPS ping from a bus during a trip.
- trip_stop_updates: what happened at one stop on one trip: when the bus actually arrived and when it left.
- delay_logs: one recorded delay at a stop on a trip, with how many minutes late the bus was.

Relationships
- A route has many stops, and a stop can serve many routes, joined through routes_stops.
- A schedule belongs to one route.
- A scheduled stop time belongs to one schedule.
- A scheduled stop time points to one stop-on-a-route.
- A trip follows one schedule.
- A trip is driven by one bus.
- A bus has at most one driver account (intended; not enforced unless a unique constraint is added).
- A bus location belongs to one trip.
- A trip stop update belongs to one trip.
- A trip stop update points to one stop-on-a-route, and there is at most one per stop per trip.
- A delay log belongs to one trip.
- A delay log points to one stop-on-a-route, and there is at most one per stop per trip.

Policies (row level security is on for all ten tables)
- Read: only signed-in users with a confirmed Kuwait University email (@ku.edu.kw or a subdomain such as @cba.ku.edu.kw), or a driver account. Anonymous visitors see nothing.
- Write by drivers: a driver may start and update trips for their own bus only, and add locations to their own bus's active trips. Drivers cannot delete anything, and cannot write arrivals, departures or delays.
- Write by the database: a trigger on bus_locations records arrivals, departures, delays and trip completion automatically by comparing each GPS ping with the next stop's geofence.
- Write by the developer: full access to all tables through the Supabase dashboard (service_role). Students have no write access at all.
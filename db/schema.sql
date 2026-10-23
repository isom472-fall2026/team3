-- CREATE DATABASE KUBusTrackingDB;
-- Supabase already creates the project database, so leave this line commented.
--
-- This file builds the whole database from nothing, in its current form.
-- It already includes the staff update (staff_members, guests, constraints) and
-- the removal of the driver role, so do NOT run those migrations after it.
-- Do NOT run this file on the live project either: its tables already exist.
-- Use it for a fresh Supabase project, or as the reference for what the schema is.
--
-- Who reads and who writes:
--   * KU students: sign in with a KU email (@ku.edu.kw or e.g. @cba.ku.edu.kw)
--     and a password. Once the email is confirmed they can READ everything.
--   * Guests: an anonymous sign-in may read buses, stops, routes, timetables,
--     trips and bus locations (not stop times, arrivals or delays).
--   * Transportation staff: accounts listed in staff_members. Besides reading,
--     they may add buses, stops, routes, route stops, departures and stop times,
--     change the columns granted below, start and update trips, add bus
--     locations to active trips, and record delay reasons. Nobody can DELETE
--     from the website.
--   * Geofencing: arrivals, departures, delays and trip completion are recorded
--     automatically by the database whenever a new location comes in (trigger
--     near the end).
--   * Developer: maintains everything else through the Supabase dashboard.
--
-- After running this file, in the Supabase dashboard:
--   1. Authentication > Sign In / Providers > Email: keep "Confirm email" ON.
--   2. Authentication > Sign In / Providers: turn ON "Allow anonymous sign-ins"
--      if guests should be able to use the app.
--   3. Authentication > Hooks > "Before User Created": choose hook_ku_email_only.
--   4. Authentication > Emails > SMTP: connect an email service (e.g. Resend).
--   5. For each staff member: add their user id to staff_members in the
--      SQL Editor:  insert into staff_members (user_id) values ('<user id>');

-- =========================================================================
-- Tables
-- =========================================================================

CREATE TABLE buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_number TEXT NOT NULL UNIQUE,
    plate_number TEXT UNIQUE,
    status TEXT CHECK (status IN ('active', 'maintenance', 'out_of_service'))
);
CREATE TABLE stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    area TEXT,                                  -- e.g. 'Jabriya', 'Shadadiya - CBA parking'
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    geofence_radius_m INT4 NOT NULL DEFAULT 50  -- metres: inside this circle the bus is "at the stop"
        CHECK (geofence_radius_m > 0)
);
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                         -- unique ignoring case (index below)
    service_type TEXT NOT NULL CHECK (service_type IN ('on_campus', 'off_campus')),  -- which page it appears on
    operating_hours TEXT,
    is_active BOOL DEFAULT TRUE
);
CREATE TABLE routes_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL,
    stop_id UUID NOT NULL,
    sequence_order INT4 NOT NULL CHECK (sequence_order > 0),
    offset_minutes INT4 CHECK (offset_minutes >= 0),
    -- Deferred, so staff can swap two stops' positions in one transaction.
    CONSTRAINT routes_stops_route_position_key
        UNIQUE (route_id, sequence_order) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (route_id) REFERENCES routes(id),
    FOREIGN KEY (stop_id) REFERENCES stops(id)
);
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL,
    planned_start_time TIME NOT NULL,           -- Kuwait local time, e.g. '08:00'
    days_of_week TEXT                           -- e.g. 'Sun,Mon,Tue,Wed,Thu'
        CHECK (days_of_week IS NULL OR
               days_of_week ~ '^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(,(Sun|Mon|Tue|Wed|Thu|Fri|Sat))*$'),
    FOREIGN KEY (route_id) REFERENCES routes(id)
);
CREATE TABLE scheduled_stop_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL,
    route_stop_id UUID NOT NULL,
    expected_arrival_time TIME,
    expected_departure_time TIME,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (route_stop_id) REFERENCES routes_stops(id)
);
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL,
    bus_id UUID NOT NULL,
    trip_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kuwait')::DATE,
    status VARCHAR NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    actual_start TIMESTAMPTZ,
    actual_completion TIMESTAMPTZ,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (bus_id) REFERENCES buses(id)
);
CREATE TABLE bus_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL,
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (trip_id) REFERENCES trips(id)
);
CREATE TABLE trip_stop_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    trips_id UUID NOT NULL,
    routes_stop_id UUID NOT NULL,
    actual_arrival_time TIMESTAMPTZ,
    actual_departure_time TIMESTAMPTZ,
    recorded_at TIMESTAMPTZ,
    UNIQUE (trips_id, routes_stop_id),          -- one row per stop per trip
    FOREIGN KEY (trips_id) REFERENCES trips(id),
    FOREIGN KEY (routes_stop_id) REFERENCES routes_stops(id)
);
CREATE TABLE delay_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    trip_id UUID NOT NULL,
    routes_stop_id UUID,
    delay_minutes INT4 CHECK (delay_minutes > 0),
    logged_at TIMESTAMPTZ,
    reason TEXT                                 -- written by staff; 1-200 characters, not only spaces
        CONSTRAINT delay_logs_reason_check
        CHECK (reason IS NULL OR (btrim(reason) <> '' AND char_length(reason) <= 200)),
    UNIQUE (trip_id, routes_stop_id),
    FOREIGN KEY (trip_id) REFERENCES trips(id),
    FOREIGN KEY (routes_stop_id) REFERENCES routes_stops(id)
);
CREATE TABLE staff_members (
    user_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- Indexes (speed up the geofence trigger, the live pages and the joins)
-- =========================================================================

CREATE UNIQUE INDEX routes_name_unique ON routes (lower(name));
-- A bus can be on only one active trip per day.
CREATE UNIQUE INDEX trips_one_active_per_bus_per_day ON trips (bus_id, trip_date) WHERE status = 'active';
CREATE INDEX idx_bus_locations_trip_recorded ON bus_locations (trip_id, recorded_at DESC);
CREATE INDEX idx_trip_stop_updates_trip ON trip_stop_updates (trips_id);
CREATE INDEX idx_trips_bus ON trips (bus_id);
CREATE INDEX idx_trips_schedule ON trips (schedule_id);
CREATE INDEX idx_schedules_route ON schedules (route_id);
CREATE INDEX idx_scheduled_stop_times_schedule ON scheduled_stop_times (schedule_id);
CREATE INDEX idx_scheduled_stop_times_route_stop ON scheduled_stop_times (route_stop_id);
CREATE INDEX idx_routes_stops_stop ON routes_stops (stop_id);

-- =========================================================================
-- Row Level Security (RLS)
-- =========================================================================

ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_stop_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_stop_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE delay_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Helper functions used by the policies:
-- TRUE for a KU email: name@ku.edu.kw or a KU subdomain such as name@cba.ku.edu.kw.
CREATE FUNCTION is_ku_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
    SELECT COALESCE(lower(p_email) ~ '^[^@[:space:]]+@([a-z0-9-]+\.)*ku\.edu\.kw$', FALSE);
$$;
-- TRUE when the signed-in user has a KU email and has confirmed it.
CREATE FUNCTION is_ku_user()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (SELECT 1 FROM auth.users u
                    WHERE u.id = auth.uid()
                      AND u.email_confirmed_at IS NOT NULL
                      AND public.is_ku_email(u.email));
$$;
-- TRUE when the signed-in user is listed in staff_members.
CREATE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (SELECT 1 FROM public.staff_members s WHERE s.user_id = auth.uid());
$$;
-- TRUE when the user signed in anonymously (a guest).
CREATE FUNCTION is_guest()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = ''
AS $$
    SELECT COALESCE((auth.jwt() ->> 'is_anonymous')::BOOLEAN, FALSE);
$$;
REVOKE EXECUTE ON FUNCTION is_staff()   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_guest()   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_ku_user() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION is_staff()   TO authenticated;
GRANT  EXECUTE ON FUNCTION is_guest()   TO authenticated;
GRANT  EXECUTE ON FUNCTION is_ku_user() TO authenticated;

-- Supabase "Before User Created" hook: refuses sign-ups that are not KU emails.
-- Anonymous (guest) sign-ins have no email and are let through.
CREATE FUNCTION hook_ku_email_only(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE
SET search_path = ''
AS $$
BEGIN
    IF COALESCE((event -> 'user' ->> 'is_anonymous')::BOOLEAN, FALSE)
       OR public.is_ku_email(event -> 'user' ->> 'email') THEN
        RETURN '{}'::JSONB;
    END IF;
    RETURN jsonb_build_object('error', jsonb_build_object(
        'message', 'Please sign up with your Kuwait University email (ending in ku.edu.kw).',
        'http_code', 403));
END;
$$;
REVOKE EXECUTE ON FUNCTION hook_ku_email_only(JSONB) FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        GRANT EXECUTE ON FUNCTION hook_ku_email_only(JSONB) TO supabase_auth_admin;
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- Read policies:
-- Signed-in users with a confirmed KU email, and staff, may read everything.
-- Visitors who are not signed in read nothing.
-- -------------------------------------------------------------------------
CREATE POLICY "KU users can read buses" ON buses
FOR SELECT TO authenticated USING ((SELECT is_ku_user()) OR (SELECT is_staff()));
CREATE POLICY "KU users can read stops" ON stops
FOR SELECT TO authenticated USING ((SELECT is_ku_user()) OR (SELECT is_staff()));
CREATE POLICY "KU users can read routes" ON routes
FOR SELECT TO authenticated USING ((SELECT is_ku_user()) OR (SELECT is_staff()));
CREATE POLICY "KU users can read routes stops" ON routes_stops
FOR SELECT TO authenticated USING ((SELECT is_ku_user()) OR (SELECT is_staff()));
CREATE POLICY "KU users can read schedules" ON schedules
FOR SELECT TO authenticated USING ((SELECT is_ku_user()) OR (SELECT is_staff()));
CREATE POLICY "KU users can read scheduled stop times" ON scheduled_stop_times
FOR SELECT TO authenticated USING ((SELECT is_ku_user()) OR (SELECT is_staff()));
CREATE POLICY "KU users can read trips" ON trips
FOR SELECT TO authenticated USING ((SELECT is_ku_user()) OR (SELECT is_staff()));
CREATE POLICY "KU users can read bus locations" ON bus_locations
FOR SELECT TO authenticated USING ((SELECT is_ku_user()) OR (SELECT is_staff()));
CREATE POLICY "KU users can read trip stop updates" ON trip_stop_updates
FOR SELECT TO authenticated USING ((SELECT is_ku_user()) OR (SELECT is_staff()));
CREATE POLICY "KU users can read delay logs" ON delay_logs
FOR SELECT TO authenticated USING ((SELECT is_ku_user()) OR (SELECT is_staff()));

-- Each user may see only their own staff_members row (so the app can ask "am I staff?").
CREATE POLICY "Users can see their own staff membership" ON staff_members
FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Guests (anonymous sign-in) may read the timetable and where buses are.
CREATE POLICY "Guests can read buses" ON buses
FOR SELECT TO authenticated USING ((SELECT is_guest()));
CREATE POLICY "Guests can read stops" ON stops
FOR SELECT TO authenticated USING ((SELECT is_guest()));
CREATE POLICY "Guests can read routes" ON routes
FOR SELECT TO authenticated USING ((SELECT is_guest()));
CREATE POLICY "Guests can read routes stops" ON routes_stops
FOR SELECT TO authenticated USING ((SELECT is_guest()));
CREATE POLICY "Guests can read schedules" ON schedules
FOR SELECT TO authenticated USING ((SELECT is_guest()));
CREATE POLICY "Guests can read trips" ON trips
FOR SELECT TO authenticated USING ((SELECT is_guest()));
CREATE POLICY "Guests can read bus locations" ON bus_locations
FOR SELECT TO authenticated USING ((SELECT is_guest()));

-- -------------------------------------------------------------------------
-- Write policies (staff):
-- Staff may add and change transport data, but never delete it from the
-- website. Which COLUMNS they may change is limited by the grants below.
-- Arrivals, departures and delays are NOT written by anyone: the geofence
-- trigger records them (staff may only add a delay's reason).
-- -------------------------------------------------------------------------
CREATE POLICY "Staff can add buses" ON buses
FOR INSERT TO authenticated WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can change buses" ON buses
FOR UPDATE TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can add stops" ON stops
FOR INSERT TO authenticated WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can change stops" ON stops
FOR UPDATE TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can add routes" ON routes
FOR INSERT TO authenticated WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can change routes" ON routes
FOR UPDATE TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can add route stops" ON routes_stops
FOR INSERT TO authenticated WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can change route stops" ON routes_stops
FOR UPDATE TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can add schedules" ON schedules
FOR INSERT TO authenticated WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can change schedules" ON schedules
FOR UPDATE TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can add stop times" ON scheduled_stop_times
FOR INSERT TO authenticated WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can change stop times" ON scheduled_stop_times
FOR UPDATE TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can start trips" ON trips
FOR INSERT TO authenticated WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can change trips" ON trips
FOR UPDATE TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()));
CREATE POLICY "Staff can change delay reasons" ON delay_logs
FOR UPDATE TO authenticated USING ((SELECT is_staff())) WITH CHECK ((SELECT is_staff()));
-- A location must be for an active trip and timestamped about now,
-- so nobody can fake a bus's past route or a finished trip.
CREATE POLICY "Staff can add locations to active trips" ON bus_locations
FOR INSERT TO authenticated
WITH CHECK ((SELECT is_staff())
            AND recorded_at BETWEEN now() - INTERVAL '2 minutes' AND now() + INTERVAL '1 minute'
            AND trip_id IN (SELECT id FROM trips WHERE status = 'active'));

-- Column-level UPDATE: signed-in users (staff, through the policies above)
-- can change only these columns. A route stop keeps its route and stop, so
-- past arrivals and delays still point at the right place.
REVOKE UPDATE ON buses                FROM authenticated;
REVOKE UPDATE ON stops                FROM authenticated;
REVOKE UPDATE ON routes               FROM authenticated;
REVOKE UPDATE ON routes_stops         FROM authenticated;
REVOKE UPDATE ON schedules            FROM authenticated;
REVOKE UPDATE ON trips                FROM authenticated;
REVOKE UPDATE ON scheduled_stop_times FROM authenticated;
REVOKE UPDATE ON delay_logs           FROM authenticated;
GRANT UPDATE (status)                                              ON buses                TO authenticated;
GRANT UPDATE (name, area, latitude, longitude, geofence_radius_m)  ON stops                TO authenticated;
GRANT UPDATE (is_active)                                           ON routes               TO authenticated;
GRANT UPDATE (sequence_order, offset_minutes)                      ON routes_stops         TO authenticated;
GRANT UPDATE (planned_start_time, days_of_week)                    ON schedules            TO authenticated;
GRANT UPDATE (status, actual_start, actual_completion)             ON trips                TO authenticated;
GRANT UPDATE (expected_arrival_time, expected_departure_time)      ON scheduled_stop_times TO authenticated;
GRANT UPDATE (reason)                                              ON delay_logs           TO authenticated;

-- -------------------------------------------------------------------------
-- Write policies (developer):
-- Everything else is maintained by the team through the Supabase dashboard
-- (service_role). Students and guests have no write policy, so they cannot
-- change anything.
-- -------------------------------------------------------------------------
CREATE POLICY "Developer can write buses" ON buses
FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Developer can write stops" ON stops
FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Developer can write routes" ON routes
FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Developer can write routes stops" ON routes_stops
FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Developer can write schedules" ON schedules
FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Developer can write scheduled stop times" ON scheduled_stop_times
FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Developer can write trips" ON trips
FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Developer can write bus locations" ON bus_locations
FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Developer can write trip stop updates" ON trip_stop_updates
FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Developer can write delay logs" ON delay_logs
FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- =========================================================================
-- Geofencing:
-- Every time a location is saved, the database checks it against the NEXT
-- stop on the route (so GPS drift near another stop can't record the wrong
-- one) and records automatically:
--   * arrival   - the bus entered the next stop's circle (geofence_radius_m)
--   * departure - the bus left the circle of the stop it last arrived at
--   * delay     - the arrival was later than the timetable
--   * trip completed - the bus arrived at the last stop of the route
-- =========================================================================

-- Distance in metres between two points (haversine formula).
CREATE FUNCTION distance_m(lat1 FLOAT8, lon1 FLOAT8, lat2 FLOAT8, lon2 FLOAT8)
RETURNS FLOAT8
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
    SELECT 2 * 6371000 * asin(sqrt(
        power(sin(radians(lat2 - lat1) / 2), 2) +
        cos(radians(lat1)) * cos(radians(lat2)) *
        power(sin(radians(lon2 - lon1) / 2), 2)));
$$;

CREATE FUNCTION geofence_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER            -- lets it write stop updates and delays, which nobody on the website can
SET search_path = public
AS $$
DECLARE
    v_route_id    UUID;
    v_schedule_id UUID;
    v_trip_date   DATE;
    v_last        RECORD;   -- stop the bus last arrived at
    v_next        RECORD;   -- next stop on the route
    v_expected    TIMESTAMPTZ;
    v_delay       INT4;
BEGIN
    SELECT s.route_id, s.id, COALESCE(t.trip_date, (now() AT TIME ZONE 'Asia/Kuwait')::DATE)
      INTO v_route_id, v_schedule_id, v_trip_date
      FROM trips t JOIN schedules s ON s.id = t.schedule_id
     WHERE t.id = NEW.trip_id AND t.status = 'active';
    IF v_route_id IS NULL THEN
        RETURN NEW;                                  -- trip not active: nothing to detect
    END IF;

    -- Departure: has the bus left the stop it last arrived at?
    SELECT u.id, rs.sequence_order, st.latitude, st.longitude, st.geofence_radius_m,
           u.actual_departure_time
      INTO v_last
      FROM trip_stop_updates u
      JOIN routes_stops rs ON rs.id = u.routes_stop_id
      JOIN stops st        ON st.id = rs.stop_id
     WHERE u.trips_id = NEW.trip_id AND u.actual_arrival_time IS NOT NULL
     ORDER BY rs.sequence_order DESC
     LIMIT 1;

    IF v_last.id IS NOT NULL AND v_last.actual_departure_time IS NULL
       AND distance_m(NEW.latitude, NEW.longitude, v_last.latitude, v_last.longitude)
           > v_last.geofence_radius_m THEN
        UPDATE trip_stop_updates
           SET actual_departure_time = NEW.recorded_at, recorded_at = now()
         WHERE id = v_last.id;
    END IF;

    -- Arrival: is the bus inside the next stop's circle?
    SELECT rs.id, rs.sequence_order, st.latitude, st.longitude, st.geofence_radius_m
      INTO v_next
      FROM routes_stops rs
      JOIN stops st ON st.id = rs.stop_id
     WHERE rs.route_id = v_route_id
       AND rs.sequence_order > COALESCE(v_last.sequence_order, 0)
     ORDER BY rs.sequence_order
     LIMIT 1;

    IF v_next.id IS NULL
       OR distance_m(NEW.latitude, NEW.longitude, v_next.latitude, v_next.longitude)
          > v_next.geofence_radius_m THEN
        RETURN NEW;                                  -- between stops, or route finished
    END IF;

    INSERT INTO trip_stop_updates (trips_id, routes_stop_id, actual_arrival_time, recorded_at)
    VALUES (NEW.trip_id, v_next.id, NEW.recorded_at, now())
    ON CONFLICT (trips_id, routes_stop_id) DO NOTHING;

    -- Delay: compare with the timetable (stored in Kuwait local time).
    SELECT (v_trip_date + sst.expected_arrival_time) AT TIME ZONE 'Asia/Kuwait'
      INTO v_expected
      FROM scheduled_stop_times sst
     WHERE sst.schedule_id = v_schedule_id AND sst.route_stop_id = v_next.id;
    IF v_expected IS NOT NULL THEN
        v_delay := floor(extract(epoch FROM (NEW.recorded_at - v_expected)) / 60);
        IF v_delay > 0 THEN
            INSERT INTO delay_logs (trip_id, routes_stop_id, delay_minutes, logged_at)
            VALUES (NEW.trip_id, v_next.id, v_delay, NEW.recorded_at)
            ON CONFLICT (trip_id, routes_stop_id) DO NOTHING;
        END IF;
    END IF;

    -- Last stop reached: the trip is finished.
    IF v_next.sequence_order = (SELECT max(sequence_order) FROM routes_stops WHERE route_id = v_route_id) THEN
        UPDATE trips SET status = 'completed', actual_completion = NEW.recorded_at
         WHERE id = NEW.trip_id;
    END IF;

    RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION geofence_check() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER bus_locations_geofence
AFTER INSERT ON bus_locations
FOR EACH ROW EXECUTE FUNCTION geofence_check();

-- =========================================================================
-- Realtime: let the pages update live when a bus moves, reaches a stop,
-- or is late.
-- =========================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE bus_locations, trips, trip_stop_updates, delay_logs;
    END IF;
END $$;

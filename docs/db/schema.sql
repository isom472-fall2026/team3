-- CREATE DATABASE KUBusTrackingDB;
-- Supabase already creates the project database, so leave this line commented.
--
-- Who reads and who writes:
--   * KU students: sign in with a KU email (@ku.edu.kw or e.g. @cba.ku.edu.kw)
--     and a password. Once the email is confirmed they can READ everything.
--   * Driver: the bus driver's phone signs in with an account the team creates
--     in the dashboard and links to the bus (buses.tracker_user_id). It may
--     read the timetable, START and UPDATE trips for its own bus, and ADD
--     locations for its own bus. It can NOT delete anything.
--   * Geofencing: arrivals, departures and delays are recorded automatically
--     by the database whenever a new location comes in (trigger at the end).
--   * Developer: maintains everything else through the Supabase dashboard.
--
-- After running this file, in the Supabase dashboard:
--   1. Authentication > Sign In / Providers > Email: keep "Confirm email" ON.
--   2. Authentication > Hooks > "Before User Created": choose hook_ku_email_only.
--   3. Authentication > Emails > SMTP: connect an email service (e.g. Resend).
--   4. For each test bus: Authentication > Users > Add user (the driver's
--      account, "Auto Confirm User" ticked), then put that user's id in
--      buses.tracker_user_id.

CREATE TABLE buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_number TEXT NOT NULL,
    plate_number TEXT,
    status TEXT,
    tracker_user_id UUID,                       -- the driver's account for this bus
    FOREIGN KEY (tracker_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TABLE stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    area TEXT,                                  -- e.g. 'Jabriya', 'Shadadiya - CBA parking'
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    geofence_radius_m INT4 NOT NULL DEFAULT 50  -- metres: inside this circle the bus is "at the stop"
);
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('on_campus', 'off_campus')),  -- which page it appears on
    operating_hours TEXT,
    is_active BOOL DEFAULT TRUE
);
CREATE TABLE routes_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL,
    stop_id UUID NOT NULL,
    sequence_order INT4 NOT NULL,
    offset_minutes INT4,
    FOREIGN KEY (route_id) REFERENCES routes(id),
    FOREIGN KEY (stop_id) REFERENCES stops(id)
);
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL,
    planned_start_time TIME NOT NULL,           -- Kuwait local time, e.g. '08:00'
    days_of_week TEXT,                          -- e.g. 'Sun,Mon,Tue,Wed,Thu'
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
    trip_date DATE DEFAULT (now() AT TIME ZONE 'Asia/Kuwait')::DATE,
    status VARCHAR,                             -- 'scheduled', 'active', 'completed', 'cancelled'
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
    recorded_at TIMESTAMPTZ DEFAULT now(),
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
    delay_minutes INT4,
    logged_at TIMESTAMPTZ,
    UNIQUE (trip_id, routes_stop_id),
    FOREIGN KEY (trip_id) REFERENCES trips(id),
    FOREIGN KEY (routes_stop_id) REFERENCES routes_stops(id)
);

-- Indexes (speed up the geofence trigger and the live student pages)
CREATE INDEX idx_bus_locations_trip_recorded ON bus_locations (trip_id, recorded_at DESC);
CREATE INDEX idx_trip_stop_updates_trip ON trip_stop_updates (trips_id);
CREATE INDEX idx_trips_bus ON trips (bus_id);
CREATE INDEX idx_routes_stops_route_seq ON routes_stops (route_id, sequence_order);
CREATE INDEX idx_buses_tracker_user ON buses (tracker_user_id);

-- Enable Row Level Security (RLS)
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
-- TRUE when the signed-in user is a bus driver's account.
CREATE FUNCTION is_driver()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (SELECT 1 FROM public.buses b WHERE b.tracker_user_id = auth.uid());
$$;
-- Supabase "Before User Created" hook: refuses sign-ups that are not KU emails.
CREATE FUNCTION hook_ku_email_only(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE
SET search_path = ''
AS $$
BEGIN
    IF public.is_ku_email(event -> 'user' ->> 'email') THEN
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

-- Read policies:
-- Only signed-in KU users with a confirmed email, or a bus driver's account,
-- may read transport information.
CREATE POLICY "KU users can read buses"
ON buses
FOR SELECT
TO authenticated
USING ((SELECT is_ku_user()) OR (SELECT is_driver()));
CREATE POLICY "KU users can read stops"
ON stops
FOR SELECT
TO authenticated
USING ((SELECT is_ku_user()) OR (SELECT is_driver()));
CREATE POLICY "KU users can read routes"
ON routes
FOR SELECT
TO authenticated
USING ((SELECT is_ku_user()) OR (SELECT is_driver()));
CREATE POLICY "KU users can read routes stops"
ON routes_stops
FOR SELECT
TO authenticated
USING ((SELECT is_ku_user()) OR (SELECT is_driver()));
CREATE POLICY "KU users can read schedules"
ON schedules
FOR SELECT
TO authenticated
USING ((SELECT is_ku_user()) OR (SELECT is_driver()));
CREATE POLICY "KU users can read scheduled stop times"
ON scheduled_stop_times
FOR SELECT
TO authenticated
USING ((SELECT is_ku_user()) OR (SELECT is_driver()));
CREATE POLICY "KU users can read trips"
ON trips
FOR SELECT
TO authenticated
USING ((SELECT is_ku_user()) OR (SELECT is_driver()));
CREATE POLICY "KU users can read bus locations"
ON bus_locations
FOR SELECT
TO authenticated
USING ((SELECT is_ku_user()) OR (SELECT is_driver()));
CREATE POLICY "KU users can read trip stop updates"
ON trip_stop_updates
FOR SELECT
TO authenticated
USING ((SELECT is_ku_user()) OR (SELECT is_driver()));
CREATE POLICY "KU users can read delay logs"
ON delay_logs
FOR SELECT
TO authenticated
USING ((SELECT is_ku_user()) OR (SELECT is_driver()));

-- Write policies (driver):
-- The driver's phone may START and UPDATE trips for its OWN bus (no DELETE),
-- and add locations to its own bus's active trips. Arrivals, departures and
-- delays are NOT written by the phone: the geofence trigger records them.
CREATE POLICY "Driver can start own bus trips"
ON trips
FOR INSERT
TO authenticated
WITH CHECK (bus_id IN (SELECT id FROM buses WHERE tracker_user_id = (SELECT auth.uid())));
CREATE POLICY "Driver can update own bus trips"
ON trips
FOR UPDATE
TO authenticated
USING (bus_id IN (SELECT id FROM buses WHERE tracker_user_id = (SELECT auth.uid())))
WITH CHECK (bus_id IN (SELECT id FROM buses WHERE tracker_user_id = (SELECT auth.uid())));
CREATE POLICY "Driver can add locations for own bus"
ON bus_locations
FOR INSERT
TO authenticated
WITH CHECK (trip_id IN (SELECT t.id FROM trips t JOIN buses b ON b.id = t.bus_id
                         WHERE b.tracker_user_id = (SELECT auth.uid()) AND t.status = 'active'));

-- Write policies (developer):
-- Everything else is maintained by the team through the Supabase dashboard
-- (service_role). Students have no write policy, so they cannot change anything.
CREATE POLICY "Developer can write buses"
ON buses
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Developer can write stops"
ON stops
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Developer can write routes"
ON routes
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Developer can write routes stops"
ON routes_stops
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Developer can write schedules"
ON schedules
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Developer can write scheduled stop times"
ON scheduled_stop_times
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Developer can write trips"
ON trips
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Developer can write bus locations"
ON bus_locations
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Developer can write trip stop updates"
ON trip_stop_updates
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Developer can write delay logs"
ON delay_logs
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- Geofencing:
-- Every time the driver's phone sends a location, the database checks it
-- against the NEXT stop on the route (so GPS drift near another stop can't
-- record the wrong one) and records automatically:
--   * arrival   - the bus entered the next stop's circle (geofence_radius_m)
--   * departure - the bus left the circle of the stop it last arrived at
--   * delay     - the arrival was later than the timetable
--   * trip completed - the bus arrived at the last stop of the route

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
SECURITY DEFINER            -- lets it write stop updates and delays, which the phone cannot
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

-- Realtime: let the student pages update live when a bus moves or reaches a stop.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE bus_locations, trips, trip_stop_updates;
    END IF;
END $$;
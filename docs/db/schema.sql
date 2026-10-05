-- CREATE DATABASE KUBusTrackingDB;
-- Supabase already creates the project database, so leave this line commented.
CREATE TABLE buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_number TEXT,
    plate_number TEXT,
    status TEXT
);
CREATE TABLE stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    campus_zone TEXT,
    latitude FLOAT8,
    longitude FLOAT8
);
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    operating_hours TEXT,
    is_active BOOL
);
CREATE TABLE routes_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID DEFAULT gen_random_uuid(),
    stop_id UUID DEFAULT gen_random_uuid(),
    sequence_order INT4,
    offset_minutes INT4,
    FOREIGN KEY (route_id) REFERENCES routes(id),
    FOREIGN KEY (stop_id) REFERENCES stops(id)
);
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID DEFAULT gen_random_uuid(),
    planned_start_time TIMESTAMPTZ,
    days_of_week TEXT,
    FOREIGN KEY (route_id) REFERENCES routes(id)
);
CREATE TABLE scheduled_stop_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID DEFAULT gen_random_uuid(),
    route_stop_id UUID DEFAULT gen_random_uuid(),
    expected_arrival_time TIME,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (route_stop_id) REFERENCES routes_stops(id)
);
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID DEFAULT gen_random_uuid(),
    bus_id UUID DEFAULT gen_random_uuid(),
    trip_date DATE,
    status VARCHAR,
    actual_start TIMESTAMPTZ,
    actual_completion TIMESTAMPTZ,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (bus_id) REFERENCES buses(id)
);
CREATE TABLE bus_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID DEFAULT gen_random_uuid(),
    latitude FLOAT8,
    longitude FLOAT8,
    recorded_at TIMESTAMPTZ,
    FOREIGN KEY (trip_id) REFERENCES trips(id)
);
CREATE TABLE "Trip_stop_updates" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    trips_id UUID DEFAULT gen_random_uuid(),
    routes_stop_id UUID DEFAULT gen_random_uuid(),
    capacity_status VARCHAR,
    actual_arrival_time TIMESTAMPTZ,
    recorded_at TIMESTAMPTZ,
    FOREIGN KEY (trips_id) REFERENCES trips(id),
    FOREIGN KEY (routes_stop_id) REFERENCES routes_stops(id)
);
CREATE TABLE delay_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    trip_id UUID DEFAULT gen_random_uuid(),
    routes_stop_id UUID DEFAULT gen_random_uuid(),
    delay_minutes INT4,
    delay_reason TEXT,
    logged_at TIMESTAMPTZ,
    FOREIGN KEY (trip_id) REFERENCES trips(id),
    FOREIGN KEY (routes_stop_id) REFERENCES routes_stops(id)
);
-- Enable Row Level Security (RLS)
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_stop_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Trip_stop_updates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE delay_logs ENABLE ROW LEVEL SECURITY;
-- Read policies:
-- Public/student users may read transport information.
CREATE POLICY "Public can read buses"
ON buses
FOR SELECT
TO anon, authenticated
USING (TRUE);
CREATE POLICY "Public can read stops"
ON stops
FOR SELECT
TO anon, authenticated
USING (TRUE);
CREATE POLICY "Public can read routes"
ON routes
FOR SELECT
TO anon, authenticated
USING (TRUE);
CREATE POLICY "Public can read routes stops"
ON routes_stops
FOR SELECT
TO anon, authenticated
USING (TRUE);
CREATE POLICY "Public can read schedules"
ON schedules
FOR SELECT
TO anon, authenticated
USING (TRUE);
CREATE POLICY "Public can read scheduled stop times"
ON scheduled_stop_times
FOR SELECT
TO anon, authenticated
USING (TRUE);
CREATE POLICY "Public can read trips"
ON trips
FOR SELECT
TO anon, authenticated
USING (TRUE);
CREATE POLICY "Public can read bus locations"
ON bus_locations
FOR SELECT
TO anon, authenticated
USING (TRUE);
CREATE POLICY "Public can read trip stop updates"
ON "Trip_stop_updates"
FOR SELECT
TO anon, authenticated
USING (TRUE);
CREATE POLICY "Public can read delay logs"
ON delay_logs
FOR SELECT
TO anon, authenticated
USING (TRUE);
-- Write policies:
-- Authenticated staff/admin users may create, update, and delete transport data.
CREATE POLICY "Authenticated users can write buses"
ON buses
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can write stops"
ON stops
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can write routes"
ON routes
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can write routes stops"
ON routes_stops
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can write schedules"
ON schedules
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can write scheduled stop times"
ON scheduled_stop_times
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can write trips"
ON trips
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can write bus locations"
ON bus_locations
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can write trip stop updates"
ON "Trip_stop_updates"
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can write delay logs"
ON delay_logs
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);
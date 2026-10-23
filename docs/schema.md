# Database Schema Documentation

## Table Overview

| Table Name | Primary Key | Description |
| :--- | :--- | :--- |
| `auth_users` | `id` | Supabase Auth user accounts[cite: 1]. |
| `staff_members` | `user_id` | Transportation staff accounts mapped to `auth.users`[cite: 1]. |
| `buses` | `id` | Bus fleet inventory and operational status[cite: 1]. |
| `stops` | `id` | Bus stop coordinates and geofencing radius[cite: 1]. |
| `routes` | `id` | Bus routes (on-campus / off-campus)[cite: 1]. |
| `routes_stops` | `id` | Junction table defining stop sequence per route[cite: 1]. |
| `schedules` | `id` | Route timetables and operational days[cite: 1]. |
| `scheduled_stop_times` | `id` | Expected arrival and departure times per stop schedule[cite: 1]. |
| `trips` | `id` | Daily trip instances generated from schedules[cite: 1]. |
| `bus_locations` | `id` | Real-time GPS location records for active trips[cite: 1]. |
| `trip_stop_updates` | `id` | Actual arrival/departure timestamps generated via geofencing[cite: 1]. |
| `delay_logs` | `id` | Delay tracking and staff notes for late trips[cite: 1]. |

---

## Detailed Table Schemas

### `auth_users`
Supabase managed table storing account credentials[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique user identifier[cite: 1]. |
| `email` | `text` | | User email address[cite: 1]. |
| `email_confirmed_at` | `timestamptz` | | Timestamp when email was verified[cite: 1]. |

---

### `staff_members`
Stores staff users authorized for management operations[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | **PK, FK** -> `auth_users(id)` | References auth user, deleted with user[cite: 1]. |
| `added_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | Timestamp when staff member was added[cite: 1]. |

---

### `buses`
Bus fleet registry[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique bus identifier[cite: 1]. |
| `bus_number` | `text` | **UK**, `NOT NULL` | Unique internal bus identifier[cite: 1]. |
| `plate_number` | `text` | **UK** | Vehicle registration plate number[cite: 1]. |
| `status` | `text` | `CHECK (status IN ('active', 'maintenance', 'out_of_service'))` | Current bus operational status[cite: 1]. |

---

### `stops`
Physical stop locations with geofencing metadata[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique stop identifier[cite: 1]. |
| `name` | `text` | `NOT NULL` | Stop name[cite: 1]. |
| `area` | `text` | | Area name (e.g., 'Jabriya', 'Shadadiya')[cite: 1]. |
| `latitude` | `float8` | `NOT NULL` | Geographic latitude coordinate[cite: 1]. |
| `longitude` | `float8` | `NOT NULL` | Geographic longitude coordinate[cite: 1]. |
| `geofence_radius_m` | `int4` | `NOT NULL`, `DEFAULT 50`, `CHECK (> 0)` | Geofence detection radius in meters[cite: 1]. |

---

### `routes`
Bus route definitions[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique route identifier[cite: 1]. |
| `name` | `text` | **UK** (case-insensitive), `NOT NULL` | Route display name[cite: 1]. |
| `service_type` | `text` | `NOT NULL`, `CHECK ('on_campus', 'off_campus')` | Type of bus service[cite: 1]. |
| `operating_hours` | `text` | | Text description of operating hours[cite: 1]. |
| `is_active` | `bool` | `DEFAULT true` | Route active state[cite: 1]. |

---

### `routes_stops`
Sequence mapping connecting routes to stops[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique route-stop mapping ID[cite: 1]. |
| `route_id` | `uuid` | **FK** -> `routes(id)`, **UK** with `sequence_order` | Associated route ID[cite: 1]. |
| `stop_id` | `uuid` | **FK** -> `stops(id)`, `NOT NULL` | Associated stop ID[cite: 1]. |
| `sequence_order` | `int4` | **UK**, `NOT NULL`, `CHECK (> 0)` | Stop position order along the route[cite: 1]. |
| `offset_minutes` | `int4` | `CHECK (>= 0)` | Travel time offset in minutes[cite: 1]. |

---

### `schedules`
Timetables for routes[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique schedule identifier[cite: 1]. |
| `route_id` | `uuid` | **FK** -> `routes(id)`, `NOT NULL` | Target route ID[cite: 1]. |
| `planned_start_time` | `time` | `NOT NULL` | Planned start time in local Kuwait time[cite: 1]. |
| `days_of_week` | `text` | `CHECK (regex format)` | Operating days (e.g. 'Sun,Mon,Tue,Wed,Thu')[cite: 1]. |

---

### `scheduled_stop_times`
Expected arrival/departure times per stop for a schedule[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique record identifier[cite: 1]. |
| `schedule_id` | `uuid` | **FK** -> `schedules(id)`, `NOT NULL` | Target schedule ID[cite: 1]. |
| `route_stop_id` | `uuid` | **FK** -> `routes_stops(id)`, `NOT NULL` | Associated route-stop record[cite: 1]. |
| `expected_arrival_time` | `time` | | Expected time bus arrives at stop[cite: 1]. |
| `expected_departure_time`| `time` | | Expected time bus departs stop[cite: 1]. |

---

### `trips`
Active and historical bus trip runs[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique trip identifier[cite: 1]. |
| `schedule_id` | `uuid` | **FK** -> `schedules(id)`, `NOT NULL` | Associated schedule ID[cite: 1]. |
| `bus_id` | `uuid` | **FK** -> `buses(id)`, `NOT NULL` | Assigned bus ID (one active per day)[cite: 1]. |
| `trip_date` | `date` | `NOT NULL`, `DEFAULT (now() AT TIME ZONE 'Asia/Kuwait')::DATE` | Date of the trip[cite: 1]. |
| `status` | `varchar` | `NOT NULL`, `DEFAULT 'scheduled'`, `CHECK ('scheduled', 'active', 'completed', 'cancelled')` | Operational status of the trip[cite: 1]. |
| `actual_start` | `timestamptz` | | Timestamp when trip actually started[cite: 1]. |
| `actual_completion` | `timestamptz` | | Timestamp when trip was completed[cite: 1]. |

---

### `bus_locations`
GPS coordinates recorded during active trips[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique log entry ID[cite: 1]. |
| `trip_id` | `uuid` | **FK** -> `trips(id)`, `NOT NULL` | Associated active trip ID[cite: 1]. |
| `latitude` | `float8` | `NOT NULL` | Current recorded latitude[cite: 1]. |
| `longitude` | `float8` | `NOT NULL` | Current recorded longitude[cite: 1]. |
| `recorded_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | Time location was captured[cite: 1]. |

---

### `trip_stop_updates`
Automated arrival and departure records via geofence trigger[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique update record ID[cite: 1]. |
| `trips_id` | `uuid` | **FK** -> `trips(id)`, **UK** with `routes_stop_id` | Associated trip ID[cite: 1]. |
| `routes_stop_id` | `uuid` | **FK** -> `routes_stops(id)`, **UK** with `trips_id` | Associated route-stop ID[cite: 1]. |
| `actual_arrival_time` | `timestamptz` | | Recorded by geofence trigger on entry[cite: 1]. |
| `actual_departure_time`| `timestamptz` | | Recorded by geofence trigger on exit[cite: 1]. |
| `created_at` | `timestamptz` | `DEFAULT now()` | Record creation timestamp[cite: 1]. |
| `recorded_at` | `timestamptz` | | Timestamp when trigger executed[cite: 1]. |

---

### `delay_logs`
Automated and manual delay logs[cite: 1].

| Column Name | Data Type | Key / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **PK** | Unique delay record ID[cite: 1]. |
| `trip_id` | `uuid` | **FK** -> `trips(id)`, **UK** with `routes_stop_id` | Associated trip ID[cite: 1]. |
| `routes_stop_id` | `uuid` | **FK** -> `routes_stops(id)`, **UK** with `trip_id` | Associated route-stop ID[cite: 1]. |
| `delay_minutes` | `int4` | `CHECK (> 0)` | Calculated delay in minutes[cite: 1]. |
| `reason` | `text` | `CHECK (1..200 chars, non-empty)` | Staff written delay justification[cite: 1]. |
| `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp[cite: 1]. |
| `logged_at` | `timestamptz` | | Delay detection timestamp[cite: 1]. |

---

## Entity Relationships

- **`auth_users` 1:0..1 `staff_members`**: A user can be assigned as a staff member (`is staff`)[cite: 1].
- **`stops` 1:N `routes_stops`**: A stop can belong to multiple routes (`is on`)[cite: 1].
- **`routes` 1:N `routes_stops`**: A route contains ordered stops (`has stops in order`)[cite: 1].
- **`routes` 1:N `schedules`**: A route has defined timetables (`has departures`)[cite: 1].
- **`schedules` 1:N `scheduled_stop_times`**: A schedule defines expected stop times (`timed at`)[cite: 1].
- **`routes_stops` 1:N `scheduled_stop_times`**: Scheduled stop times map to a route stop[cite: 1].
- **`schedules` 1:N `trips`**: A schedule generates active trip instances (`expects bus at` / `runs as`)[cite: 1].
- **`buses` 1:N `trips`**: A bus runs active trips[cite: 1].
- **`trips` 1:N `bus_locations`**: A trip periodically reports GPS location records[cite: 1].
- **`trips` 1:N `trip_stop_updates`**: A trip records actual arrivals and departures[cite: 1].
- **`routes_stops` 1:N `trip_stop_updates`**: Arrival and departure updates occur at a route stop[cite: 1].
- **`trips` 1:N `delay_logs`**: A trip logs delays when late[cite: 1].
- **`routes_stops` 1:N `delay_logs`**: Delays occur at specific route stops[cite: 1].
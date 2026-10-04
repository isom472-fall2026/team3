# Kuwait University Bus Tracking System — Proposal

**Team: Code it.**\
ISOM 472 · Fall 2026/2027 · Kuwait University

**Team Members:**\
Jumana Shams\
Zeinab Sharif\
Ayah Reda\
Abdulrahman Alyaseen\
Roqaya Aldurai\
Sara Alshamsi

## 1. The client, and how you reach them

Our proposed client is Kuwait University's Transportation and Operations Office at Sabah Al-Salem University City (Shadadiya). The office is responsible for campus transportation operations, including the buses used to transport students between parking areas and academic buildings.

Our team does not yet have a named contact within the office. We plan to contact the Transportation and Operations Office directly to introduce the project, identify the appropriate staff member, and arrange a meeting to discuss the current bus operations and collect requirements.

## 2. What happens today, and what goes wrong

Students use campus buses to travel between parking areas and academic buildings. We need to confirm how the current schedules and bus information are communicated. The problem we want to investigate is that students may not know where the bus currently is, whether it has already passed their stop, or when the next bus is expected to arrive. This can leave students waiting without reliable arrival information, particularly during busy hours.

We will verify the current process and the extent of this problem with students and transportation staff before development.

## 3. Who is better off, and how you would know

The main beneficiaries are students waiting at bus stops and transportation staff managing campus bus routes. Students would have better information about bus locations and expected arrival times, while transportation staff would have a clearer view of active trips, actual stop arrivals, and delays.

The main signal will be the average student waiting time during peak hours. As a baseline, team members who currently use the university bus service will record how long they wait for the bus before the system is introduced.

On [DATE], the observed waiting time was [WAITING TIME] minutes at [BUS STOP]. This will serve as our initial baseline for comparison during prototype testing.

During the pilot, we will compare student waiting times with this baseline. We will also measure how closely the system's estimated arrival times match the actual arrival times recorded automatically when buses reach their stops.

## 4. What the system does, in outline

- Display active buses on a campus map using their latest reported locations.
- Automatically receive location updates from a device associated with an active bus.
- Track the progress of each active bus along its assigned route.
- Detect when a bus reaches a stop using its location and a defined geographic radius around the stop.
- Automatically record the actual arrival time when a bus reaches a stop.
- Show estimated arrival times for upcoming bus stops.
- Flag buses that are running behind schedule by comparing scheduled and actual arrival times.
- Show the past week's trip records for transportation staff.

The system is designed so that drivers do not need to manually update their current location or interact with the system while driving. This removes the need for a driver interface and allows location and stop-arrival information to be updated automatically.

## 5. What it records

| Thing | What it holds |
| :--- | :--- |
| Stop | Name, campus zone, latitude, longitude, geofence radius |
| Route | Name, operating hours, active status |
| Route Stop | Route, stop, sequence order, default time offset |
| Schedule | Route, planned start time, operating days |
| Scheduled Stop Time | Schedule, route stop, expected arrival time |
| Bus | Bus number, plate number, capacity, status |
| Trip | Schedule, bus, trip date, status, actual start and completion times |
| Bus Location | Trip, latitude, longitude, recorded time |
| Trip Stop Update | Trip, route stop, actual arrival time, recorded time |
| Delay Log | Trip, route stop if applicable, delay duration, reason, logged time |

One route has many stops, and a stop may belong to several routes. Route Stop records define which stops belong to a route and the order in which they are visited. A route may have multiple schedules, and scheduled stop times define when a bus is expected to reach each stop.

Each actual trip is connected to a schedule and a bus. During an active trip, location updates are recorded automatically from a device associated with the bus.

The system compares the bus's location with the known coordinates of the stops on its route. When the bus enters the defined geographic radius around the appropriate stop, the system recognizes that the bus has arrived and records the actual arrival time. These records allow the system to display current bus information, calculate delays, and maintain a history of completed trips.

## 6. In scope by the final week — and what is not

**Working by the final week:**

- A mobile-friendly website showing active buses and their latest reported locations.
- Bus routes, stops, and schedule information.
- Automatic location updates from a device representing an active bus during prototype testing.
- Automatic detection of bus arrivals at stops using location-based geofencing.
- Automatic recording of actual stop arrival times.
- Estimated arrival times for upcoming stops.
- Trip records and delay flags for transportation staff.
- Administrator access for managing system information.

**Deliberately not included:**

- Native iOS or Android applications.
- Permanent GPS hardware installation on university buses.
- Automated passenger counting.
- Online ticketing and push notifications.
- Integration with university student records.

For the semester prototype, a mobile device will act as the location source for a bus during testing. The device will provide location coordinates while a trip is active. The system will use these coordinates to update the bus's location and automatically detect when it reaches a configured bus stop.

This allows the team to develop and demonstrate automatic bus tracking and stop detection without requiring permanent GPS hardware to be installed on Kuwait University buses during the semester.

## 7. After the semester

The Transportation and Operations Office could continue using the website if it approves deployment and assigns someone to maintain it. The code and documentation will remain in the team's GitHub repository so the system can be maintained or further developed.

Future versions could replace the prototype mobile location source with dedicated GPS devices installed on university buses. These devices could automatically transmit bus locations during normal operation without requiring drivers to interact with the system.

Future versions could also include more accurate arrival predictions using historical trip data, automated passenger counting and capacity information, notifications for approaching or delayed buses, additional routes and buses, and other features based on feedback from students and transportation staff.

The system could also potentially be adapted for other universities, colleges, schools, hospitals, large companies, or other organizations that operate fixed-route shuttle or bus services. The same tracking and geofencing approach could be used after adapting the routes, stops, schedules, and operational requirements to each organization's transportation service.

## 8. What you told the client this is

**Client discussion has not yet taken place.** Our team does not currently have a named contact within the Transportation and Operations Office. When we meet with a representative, we will explain that this is an academic project developed by MIS students for ISOM 472 over one semester.

We will explain that the initial system is a prototype developed for academic purposes and that continued maintenance after the final evaluation in December is not guaranteed. We will also explain that the semester prototype will demonstrate automatic location tracking using a mobile device as the location source rather than permanently installed GPS hardware.

We will explain the proposed scope of the bus tracking system and document the client's feedback, requirements, and any requested changes after the meeting.

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

Our client is Kuwait University's Transportation and Operations Office at Sabah Al-Salem University City (Shadadiya). The office is responsible for campus transportation operations, including the buses used to transport students between pickup locations and the university.

Our primary contact is **Abeer Al-Ammar, Head of the Transportation Department (رئيسة قسم النقليات)**. She can be reached by phone at **24987894**. Our team contacted her to discuss the current bus operations, understand the existing transportation process, and collect requirements for the proposed system.

## 2. What happens today, and what goes wrong

Students use campus buses to travel between pickup locations and the university. The current process relies on fixed schedules, and students do not have live information about the location of the bus. Students may not know where the bus currently is, whether it has already left their pickup location, or when it is expected to arrive. This can leave students waiting without reliable arrival information, particularly when a bus does not follow its scheduled time exactly.

Our team will use information collected from students who currently use the bus service and from transportation staff to understand the current process and identify where better tracking and arrival information could help.

## 3. Who is better off, and how you would know

The main beneficiaries are students using the university bus service and transportation staff managing the bus routes. Students would have better information about bus locations and expected arrival times, while transportation staff would have a clearer view of active trips, actual stop arrivals, and delays.

The main signal will be the average student waiting time. As a baseline, team members who currently use the university bus service will record their arrival time at the pickup location, the scheduled bus time, the actual departure time, and the arrival time at the university before the system is introduced.

For our initial baseline observation, a team member arrived at the Kuwait University bus pickup location in Jabriya at **8:01 AM**. The bus was scheduled for **8:00 AM** and actually departed at **8:05 AM**. The student therefore waited **4 minutes** after arriving at the pickup location, while the bus departed **5 minutes later than its scheduled time**. The bus arrived at Sabah Al-Salem University City (Shadadiya) at **8:40 AM**, making the observed trip from Jabriya to Shadadiya approximately **35 minutes** from departure.

This observation will serve as our initial baseline. We will collect additional observations to calculate a more representative average waiting time. During prototype testing, we will compare student waiting times and bus delays with these baseline observations. We will also measure how closely the system's estimated arrival times match the actual arrival times recorded when buses reach their stops.

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
| Stop | Name, campus zone, latitude, longitude |
| Route | Name, operating hours, active status |
| Route Stop | Route, stop, sequence order, default time offset |
| Schedule | Route, planned start time, operating days |
| Scheduled Stop Time | Schedule, route stop, expected arrival time |
| Bus | Bus number, plate number, status |
| Trip | Schedule, bus, trip date, status, actual start and completion times |
| Bus Location | Trip, latitude, longitude, recorded time |
| Trip Stop Update | Trip, route stop, event time, event type, passenger count |
| Delay Log | Trip, route stop if applicable, delay duration, reason, logged time |

One route has many stops, and a stop may belong to several routes. Route Stop records define which stops belong to a route and the order in which they are visited. A route may have multiple schedules, and scheduled stop times define when a bus is expected to reach each stop.

Each actual trip is connected to a schedule and a bus. During an active trip, location updates are recorded automatically from a device associated with the bus.

The system compares the bus's location with the known coordinates of the stops on its route. When the bus reaches the appropriate stop, the system recognizes that the bus has arrived and records the actual arrival time. These records allow the system to display current bus information, calculate delays, and maintain a history of completed trips.

## 6. In scope by the final week — and what is not

**Working by the final week:**

- A mobile-friendly website showing active buses and their latest reported locations.
- Bus routes, stops, and schedule information.
- Automatic location updates from a device representing an active bus during prototype testing.
- Automatic detection of bus arrivals at stops using location data.
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

The system could also potentially be adapted for other universities, colleges, schools, hospitals, large companies, or other organizations that operate fixed-route shuttle or bus services. The same tracking approach could be used after adapting the routes, stops, schedules, and operational requirements to each organization's transportation service.

## 8. What you told the client this is

Our team explained to our client contact, **Abeer Al-Ammar, Head of the Transportation Department**, that this is an academic project developed by MIS students for ISOM 472 over one semester.

We explained that the initial system is a prototype developed for academic purposes and that continued maintenance after the final evaluation in December is not guaranteed. We also explained that the semester prototype will demonstrate automatic location tracking using a mobile device as the location source rather than permanently installed GPS hardware.

We discussed the proposed scope of the bus tracking system and will use the client's feedback and information about the current transportation process to refine the system's requirements during development.

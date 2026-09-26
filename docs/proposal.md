# Proposal

## 1. The client, and how you reach them

Our proposed client is Kuwait University's Transportation and Operations Office at Sabah Al-Salem University City (Shadadiya). The office is responsible for campus transportation operations, including the buses used to transport students between parking areas and academic buildings.

Our team does not yet have a named contact within the office. We plan to contact the Transportation and Operations Office directly to introduce the project, identify the appropriate staff member, and arrange a meeting to discuss the current bus operations and collect requirements.

## 2. What happens today, and what goes wrong

Students use campus buses to travel between parking areas and academic buildings. We need to confirm how the current schedules and bus information are communicated. The problem we want to investigate is that students may not know when the next bus will arrive or whether it has enough space. This can leave students waiting without reliable arrival information, particularly during busy hours.

We will verify the current process and the extent of this problem with students and transportation staff before development.

## 3. Who is better off, and how you would know

The main beneficiaries are students waiting at bus stops and transportation staff managing campus bus routes. Students would have better information about when buses are expected to arrive and their reported capacity, while transportation staff would have a clearer view of active trips and delays.

The main signal will be the average student waiting time during peak hours. We will record waiting times before testing the system and compare them with waiting times during a pilot. We will also measure how closely estimated arrival times match actual arrivals.

## 4. What the system does, in outline

- Display active buses on a campus map using their latest reported locations.
- Show estimated arrival times for each bus stop.
- Allow drivers to update their current stop and trip status.
- Show bus capacity as Seats Available, Standing Room Only, or Full.
- Flag buses that are running behind schedule.
- Show the past week's trip records for transportation staff.

## 5. What it records

| Thing | What it holds |
|---|---|
| Stop | Name, location, campus zone |
| Route | Name, ordered stops, operating hours |
| Bus | Vehicle identifier, capacity, assigned route |
| Driver | Name, assigned vehicle |
| Trip | Bus, driver, route, start time, completion time |
| Trip Update | Trip, reported stop, timestamp, capacity status |

One route has many stops, and a stop may belong to several routes. Each trip has one bus and one driver. Every trip update records the reported location, capacity status, and time. These records will allow the system to display current bus information while also keeping a history of completed trips.

## 6. In scope by the final week — and what is not

**Working by the final week:**

- A mobile-friendly website showing active buses and their latest reported locations.
- Estimated arrival times and capacity status for students.
- A driver interface for updating location, trip status, and capacity while stopped.
- Trip records and delay flags for transportation staff.
- Email and password authentication for drivers and administrators.

**Deliberately not included:**

- Native iOS or Android applications.
- Automatic GPS hardware installation.
- Automated passenger counting.
- Online ticketing and push notifications.
- Integration with university student records.

For the semester prototype, bus locations will be updated manually by drivers rather than tracked continuously through GPS hardware. This keeps the project realistic for one semester while still allowing the team to develop and test the main tracking and arrival-information features.

## 7. After the semester

The Transportation and Operations Office could continue using the website if it approves deployment and assigns someone to maintain it. The code and documentation will remain in the team's GitHub repository so the system can be maintained or further developed.

Future versions could add automatic GPS tracking, more accurate arrival predictions, automated passenger counting, notifications, and other features based on feedback from students and transportation staff.

## 8. What you told the client this is

**Client discussion has not yet taken place.** Our team does not currently have a named contact within the Transportation and Operations Office. When we meet with a representative, we will explain that this is an academic project developed by MIS students for ISOM 472 over one semester.

We will explain that the initial system is a prototype developed for academic purposes and that continued maintenance after the final evaluation in December is not guaranteed. We will also explain the proposed scope of the bus tracking system and document the client's feedback, requirements, and any requested changes after the meeting.

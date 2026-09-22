# Proposal

## 1. The client, and how you reach them

Our proposed client is Kuwait University's Transportation and Operations Office at Sabah Al-Salem University City (Shadadiya). Our contact is [name and position to be confirmed]. We plan to contact them through [communication channel] to discuss campus bus operations and collect requirements.

## 2. What happens today, and what goes wrong

Students use campus buses to travel between parking areas and academic buildings. We need to confirm how the current schedules and bus information are communicated. The problem we aim to investigate is that students may not know when the next bus will arrive or whether it has enough space. During busy hours, this may leave students waiting without reliable arrival information. We will verify the current process and these problems with students and transportation staff.

## 3. Who is better off, and how you would know

Students waiting at bus stops and transportation staff managing the routes. The main signal is the average student waiting time during peak hours. We will measure waiting times before and during a pilot test and compare the results. We will also compare estimated arrival times with actual arrivals.

## 4. What the system does, in outline

- Display active buses on a campus map using their latest reported locations.
- Show estimated arrival times for selected bus stops.
- Allow drivers to update their current stop and trip status.
- Show bus capacity as Seats Available, Standing Room Only, or Full.
- Flag buses running behind schedule.
- Show trip records and delays for transportation staff.

## 5. What it records

| Thing | What it holds |
|---|---|
| Stop | Name, location, campus zone |
| Route | Name, ordered stops, operating hours |
| Bus | Vehicle identifier, capacity, assigned route |
| Driver | Name, assigned vehicle |
| Trip | Bus, driver, route, start and completion times |
| Trip Update | Trip, reported stop, timestamp, capacity status |

One route has many stops, and a stop may belong to several routes. Each trip has one bus and one driver. Every update records the reported location, capacity status, and timestamp.

## 6. In scope by the final week — and what is not

**Working by the final week:**

- A mobile-friendly website showing active buses, reported locations, estimated arrival times, and capacity status.
- A driver interface for manually updating bus location, capacity, and trip status while stopped.
- An administrator dashboard showing trip records and delay flags.
- Email and password authentication for drivers and administrators.

**Deliberately not:**

- Native iOS or Android applications.
- Automatic GPS tracking or hardware installation.
- Automated passenger counting.
- Online ticketing and push notifications.
- Integration with university student records.

## 7. After the semester

The transportation office could continue using the website if it approves deployment and assigns someone to maintain it. The code and documentation will remain in the team's GitHub repository for future MIS teams to develop further. Future versions could include automatic GPS tracking and improved arrival predictions.

## 8. What you told the client this is

Client discussion has not yet been confirmed. We plan to explain that this is an undergraduate student project developed for ISOM 472 over one semester, with a functional prototype using sample data. We will clarify that deployment requires university approval and that maintenance after the final evaluation in December is not guaranteed.

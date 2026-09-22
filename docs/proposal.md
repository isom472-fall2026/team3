# Proposal

## 1. The client, and how you reach them

Our proposed client is Kuwait University's Transportation and Operations Office at Sabah Al-Salem University City (Shadadiya). Our contact is [name and position to be confirmed]. We will arrange a meeting through [actual communication channel] to discuss campus bus operations and collect requirements.

## 2. What happens today, and what goes wrong

Students use campus buses to travel between parking areas and academic buildings. We need to confirm how the current schedules and bus information are communicated. The problem we want to investigate is that students may not know when the next bus will arrive or whether it has enough space. This can leave students waiting without reliable arrival information, particularly during busy hours. We will verify the problem with students and transportation staff before development.

## 3. Who is better off, and how you would know

Students waiting at bus stops and transportation staff managing the routes. The main signal is the average student waiting time during peak hours. We will record waiting times before testing the system and compare them with waiting times during a pilot. We will also measure how closely estimated arrival times match actual arrivals.

## 4. What the system does, in outline

- Display active buses on a campus map using their latest reported locations
- Show estimated arrival times for each bus stop
- Allow drivers to update their current stop and trip status
- Show bus capacity: Seats Available, Standing Room Only, or Full
- Flag buses that are running behind schedule
- Show the past week's trip records for transportation staff

## 5. What it records

| Thing | What it holds |
|---|---|
| Stop | name, location, campus zone |
| Route | name, ordered stops, operating hours |
| Bus | vehicle identifier, capacity, assigned route |
| Driver | name, assigned vehicle |
| Trip | bus, driver, route, start time, completion time |
| Trip Update | trip, reported stop, timestamp, capacity status |

One route has many stops, and a stop may belong to several routes. Each trip has one bus and one driver. Every update records the reported location, capacity status, and time.

## 6. In scope by the final week — and what is not

**Working by the final week:** A mobile-friendly website showing active buses, reported locations, estimated arrival times, and capacity status. Drivers can update their location and capacity while stopped. Transportation staff can view trip records and delay flags. Drivers and administrators sign in with an email and password.

**Deliberately not:** Native mobile applications, automatic GPS hardware installation, automated passenger counting, online ticketing, push notifications, and integration with university student records. Bus locations will be updated manually by drivers rather than tracked continuously.

## 7. After the semester

The transportation office could continue using the website if it approves deployment and assigns someone to maintain it. The code and documentation will remain in the team's GitHub repository so future MIS teams can improve the system. Future versions could add automatic GPS tracking and more accurate arrival predictions.

## 8. What you told the client this is

**Client discussion: Not yet confirmed.** We will explain that this is an academic project developed by MIS students for ISOM 472 over one semester; that the initial system is a prototype using sample data; and that maintenance after the final evaluation in December is not guaranteed. We will document the client's agreement and feedback after the first meeting.

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// 'HH:MM:SS' (Postgres time) → minutes after midnight.
function timeToMinutes(time) {
  const [h, m, s] = String(time).split(':').map(Number)
  return h * 60 + m + (s || 0) / 60
}

// A departure's planned run time: from planned_start_time to the expected arrival at the
// route's last stop (highest sequence_order). A run that crosses midnight wraps round.
function plannedMinutes(schedule) {
  let last = null
  for (const sst of schedule.scheduled_stop_times || []) {
    const order = sst.routes_stops?.sequence_order
    if (sst.expected_arrival_time == null || order == null) continue
    if (!last || order > last.order) last = { order, time: sst.expected_arrival_time }
  }
  if (!last) return null
  const diff = timeToMinutes(last.time) - timeToMinutes(schedule.planned_start_time)
  return diff < 0 ? diff + 24 * 60 : diff
}

// #190: criteria 1–2 so far — the 5-trip minimum, the click and the
// "All departures on time" card come with criteria 3–5.
function ArrivalsPage() {
  const [cards, setCards] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadCards = async () => {
      const [schedulesResult, tripsResult] = await Promise.all([
        supabase
          .from('schedules')
          .select('id, planned_start_time, routes(name), scheduled_stop_times(expected_arrival_time, routes_stops(sequence_order))'),
        supabase
          .from('trips')
          .select('schedule_id, actual_start, actual_completion')
          .eq('status', 'completed'),
      ])
      if (!isMounted || schedulesResult.error || tripsResult.error) return

      const runTimesBySchedule = {}
      for (const trip of tripsResult.data || []) {
        const start = Date.parse(trip.actual_start)
        const end = Date.parse(trip.actual_completion)
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue
        ;(runTimesBySchedule[trip.schedule_id] ||= []).push((end - start) / 60000)
      }

      const measured = []
      for (const schedule of schedulesResult.data || []) {
        const planned = plannedMinutes(schedule)
        const runTimes = runTimesBySchedule[schedule.id]
        if (planned == null || !runTimes) continue
        const average = runTimes.reduce((sum, m) => sum + m, 0) / runTimes.length
        measured.push({
          id: schedule.id,
          route: schedule.routes?.name?.trim() || 'Unnamed route',
          departure: String(schedule.planned_start_time).slice(0, 5),
          overBy: average - planned,
          overMinutes: Math.round(average - planned),
        })
      }
      // Filtered on the rounded figure so a card never reads "+0 min over plan".
      const overPlan = measured
        .filter((departure) => departure.overMinutes > 0)
        .sort((a, b) => b.overBy - a.overBy)
      setCards(overPlan.slice(0, 3))
    }

    loadCards()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="bus-confirmed-section" id="trip-times-page">
      <div className="bus-content-intro">
        <h2>Trip times</h2>
        <p>Departures that run furthest over their planned time.</p>
      </div>

      <div className="slowest-departures" id="slowest-departures">
        {cards.map((card) => (
          <div key={card.id} className="bus-card slowest-departure-card" data-schedule-id={card.id}>
            <div className="stop-name">{card.route}</div>
            <div className="stop-area">Departs {card.departure}</div>
            <div className="slowest-departure-over">
              +{card.overMinutes} min over plan
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ArrivalsPage

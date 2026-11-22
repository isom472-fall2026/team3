import { kuwaitClock } from './kuwaitTime.js'

// A bus that has not started up to 15 minutes after its planned time may still come.
const NOT_STARTED_GRACE_SECONDS = 15 * 60

// Newest first; a row with no logged_at cannot be placed in time, so it goes last.
function byNewest(a, b) {
  if (!a.logged_at) return b.logged_at ? 1 : 0
  if (!b.logged_at) return -1
  return Date.parse(b.logged_at) - Date.parse(a.logged_at)
}

function secondsOfDay(timeStr) {
  const [h, m, s] = timeStr.split(':').map(Number)
  return h * 3600 + m * 60 + (s || 0)
}

// Status for one of today's departures, or null when nothing should be shown.
// Cancelled returns null: story #120's "Cancelled today" label is that status.
// Statuses are matched exactly, so a wrong value such as 'Active' is never shown as running.
export function departureStatus(plannedStartTime, todayTrips, nowSeconds) {
  const trips = todayTrips || []
  if (trips.some((t) => t.status === 'cancelled')) return null

  const active = trips.find((t) => t.status === 'active')
  if (active) {
    const delay = (active.delay_logs || [])
      .filter((row) => row.delay_minutes > 0)
      .sort(byNewest)[0]
    return {
      kind: 'running',
      text: delay ? `Running +${delay.delay_minutes} min` : 'Running',
    }
  }

  const completed = trips
    .filter((t) => t.status === 'completed')
    .sort((a, b) => {
      if (!a.actual_start) return b.actual_start ? 1 : 0
      if (!b.actual_start) return -1
      return Date.parse(a.actual_start) - Date.parse(b.actual_start)
    })[0]
  if (completed) {
    return {
      kind: 'left',
      text: completed.actual_start ? `Left at ${kuwaitClock(completed.actual_start)}` : 'Left',
    }
  }

  if (trips.length > 0 || !plannedStartTime) return null

  if (nowSeconds - secondsOfDay(plannedStartTime) > NOT_STARTED_GRACE_SECONDS) {
    return { kind: 'did-not-start', text: 'Did not start' }
  }
  return { kind: 'not-started', text: 'Not started yet' }
}

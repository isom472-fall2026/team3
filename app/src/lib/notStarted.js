// A bus counts as "not started" only once it is this late, so a normal slow start is not flagged.
const GRACE_SECONDS = 10 * 60

function secondsOfDay(time) {
  const [h, m, s] = String(time).split(':').map(Number)
  return h * 3600 + m * 60 + (s || 0)
}

function hasNoDays(schedule) {
  return String(schedule.days_of_week ?? '').trim() === ''
}

// Today's departures more than 10 minutes past their planned start with no trip today (#108).
// Schedules with no days set cannot be placed on a day, so they are counted, not listed.
export function findNotStarted(schedules, tripScheduleIds, weekday, nowSeconds) {
  const noDays = schedules.filter(hasNoDays).length
  const rows = schedules
    .filter((s) => !hasNoDays(s))
    .filter((s) => {
      const days = String(s.days_of_week).split(',').map((d) => d.trim())
      return days.includes(weekday)
    })
    .filter((s) => nowSeconds - secondsOfDay(s.planned_start_time) > GRACE_SECONDS)
    .filter((s) => !tripScheduleIds.has(s.id))
    .map((s) => ({
      id: s.id,
      routeName: s.routes?.name?.trim() || 'Unnamed route',
      time: String(s.planned_start_time).slice(0, 5),
      minutesLate: Math.floor((nowSeconds - secondsOfDay(s.planned_start_time)) / 60),
    }))
    .sort((a, b) => a.time.localeCompare(b.time) || a.routeName.localeCompare(b.routeName))
  return { rows, noDays }
}

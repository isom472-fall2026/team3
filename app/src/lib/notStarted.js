// A bus counts as "not started" only once it is this late, so a normal slow start is not flagged.
const GRACE_SECONDS = 10 * 60

function secondsOfDay(time) {
  const [h, m, s] = String(time).split(':').map(Number)
  return h * 3600 + m * 60 + (s || 0)
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function hasNoDays(schedule) {
  return String(schedule.days_of_week ?? '').trim() === ''
}

function readDays(schedule) {
  return String(schedule.days_of_week).split(',').map((d) => d.trim()).filter((d) => WEEKDAYS.includes(d))
}

// Days set, but none of them is a weekday we can read (e.g. "Weekdays").
function hasUnreadableDays(schedule) {
  return !hasNoDays(schedule) && readDays(schedule).length === 0
}

// Only routes explicitly marked active run; a route with no flag set is treated as not running.
function routeIsActive(schedule) {
  return schedule.routes?.is_active === true
}

// Today's departures more than 10 minutes past their planned start with no trip today (#108).
// Schedules with no days set, or days we cannot read, cannot be placed on a day, so they
// are counted, not listed.
export function findNotStarted(allSchedules, tripScheduleIds, weekday, nowSeconds) {
  const schedules = allSchedules.filter(routeIsActive)
  const noDays = schedules.filter(hasNoDays).length
  const unreadableDays = schedules.filter(hasUnreadableDays).length
  const rows = schedules
    .filter((s) => !hasNoDays(s) && !hasUnreadableDays(s))
    .filter((s) => readDays(s).includes(weekday))
    .filter((s) => nowSeconds - secondsOfDay(s.planned_start_time) > GRACE_SECONDS)
    .filter((s) => !tripScheduleIds.has(s.id))
    .map((s) => ({
      id: s.id,
      routeName: s.routes?.name?.trim() || 'Unnamed route',
      time: String(s.planned_start_time).slice(0, 5),
      minutesLate: Math.floor((nowSeconds - secondsOfDay(s.planned_start_time)) / 60),
    }))
    .sort((a, b) => a.time.localeCompare(b.time) || a.routeName.localeCompare(b.routeName))
  return { rows, noDays, unreadableDays }
}

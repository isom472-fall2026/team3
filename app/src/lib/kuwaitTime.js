// Trips and timetables are stored in Kuwait time, so "today" is Kuwait's today,
// whatever time zone the viewer's device is set to.
export function kuwaitToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuwait' }).format(new Date()) // YYYY-MM-DD
}


// "HH:MM" in Kuwait time, for a timestamp from the database.
export function kuwaitClock(timestamp) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(timestamp))
}

// 'Sun'…'Sat', the same spelling schedules.days_of_week uses.
export function kuwaitWeekday(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kuwait', weekday: 'short' }).format(date)
}

export function kuwaitSecondsOfDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type) => Number(parts.find((p) => p.type === type).value)
  return part('hour') * 3600 + part('minute') * 60 + part('second')
}

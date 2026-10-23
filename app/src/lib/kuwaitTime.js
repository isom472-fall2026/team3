// Trips and timetables are stored in Kuwait time, so "today" is Kuwait's today,
// whatever time zone the viewer's device is set to.
export function kuwaitToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuwait' }).format(new Date()) // YYYY-MM-DD
}


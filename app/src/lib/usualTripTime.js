// Fewer trips than this is too little to call "usual", so no line is shown.
const MIN_TRIPS = 5

// How long a departure usually takes (#192): the average actual trip time of its completed
// trips, rounded to the nearest minute. Only trips with both a start and an end time count.
export function usualTripMinutes(trips, scheduleIds) {
  const durations = trips
    .filter((t) => scheduleIds.includes(t.schedule_id))
    .filter((t) => t.status === 'completed' && t.actual_start && t.actual_completion)
    .map((t) => (Date.parse(t.actual_completion) - Date.parse(t.actual_start)) / 60000)
    .filter((m) => Number.isFinite(m) && m >= 0)

  if (durations.length < MIN_TRIPS) return null
  const average = durations.reduce((sum, m) => sum + m, 0) / durations.length
  return { minutes: Math.round(average), trips: durations.length }
}

// Builds the fake locations a test bus sends along its route (#106).
// The bus drives in a straight line from stop to stop, and sends 3 points inside
// each stop's circle so the geofence trigger records the arrival.

// Kuwait's bounding box. A stop outside it has a wrong location, so it is skipped.
const KUWAIT = { minLat: 28.5, maxLat: 30.1, minLng: 46.5, maxLng: 48.5 }

// About how far apart the points between two stops are, in metres.
const STEP_M = 80

export function isInKuwait(lat, lng) {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    lat >= KUWAIT.minLat && lat <= KUWAIT.maxLat &&
    lng >= KUWAIT.minLng && lng <= KUWAIT.maxLng
  )
}

// Distance in metres (haversine), the same formula as distance_m() in the database.
export function distanceM(a, b) {
  const r = 6371000
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(h))
}

// The point `metres` along the straight line from a towards b (negative goes the other way).
function along(a, b, metres) {
  const d = distanceM(a, b)
  if (d === 0) return { lat: a.lat, lng: a.lng }
  const f = metres / d
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f }
}

// routeStops: rows ordered by sequence_order, each { name, latitude, longitude, geofence_radius_m }.
// Returns { stops, points }: the stops the bus will visit, and the points to send in order.
// Each point is { lat, lng, stopName } — stopName is set while the bus is inside that stop's circle.
export function buildTestBusPath(routeStops) {
  const stops = (routeStops || [])
    .filter((s) => isInKuwait(s.latitude, s.longitude))
    .map((s) => ({ name: s.name, lat: s.latitude, lng: s.longitude, radius: s.geofence_radius_m || 50 }))

  if (stops.length < 2) return { stops, points: [] }

  const points = []
  stops.forEach((stop, i) => {
    const prev = stops[i - 1]
    const next = stops[i + 1]
    // Half the radius in from the edge, so all 3 points are well inside the circle.
    const inside = Math.max(stop.radius * 0.5, 1)

    // Drive from the previous stop's circle to this stop's circle.
    if (prev) {
      const gap = distanceM(prev, stop)
      const start = prev.radius * 0.5
      const end = gap - inside
      for (let m = start + STEP_M; m < end; m += STEP_M) {
        points.push({ ...along(prev, stop, m), stopName: null })
      }
    }

    // Three points inside this stop's circle: arriving, at the stop, leaving.
    const arriving = prev ? along(stop, prev, inside) : along(stop, next, -inside)
    const leaving = next ? along(stop, next, inside) : along(stop, prev, -inside)
    points.push({ ...arriving, stopName: stop.name })
    points.push({ lat: stop.lat, lng: stop.lng, stopName: stop.name })
    points.push({ ...leaving, stopName: stop.name })
  })

  return { stops, points }
}

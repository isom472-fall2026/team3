import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { kuwaitToday } from './kuwaitTime.js'

// Today's running buses, each with its latest reported position.
// Shared by the live map (#31) and the bus-info pages (#35, #36, #48).
//
// Returns { buses, loading, error, reload }, where each bus is
//   { tripId, busNumber, routeName, serviceType,
//     location: { latitude, longitude, recordedAt } | null }
export function useActiveBuses() {
  const [state, setState] = useState({ buses: [], loading: true, error: false })
  const [version, setVersion] = useState(0)

  // Asks for a fresh load; the effect below does the loading.
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let current = true
    fetchActiveBuses()
      .then((buses) => current && setState({ buses, loading: false, error: false }))
      .catch(() => current && setState({ buses: [], loading: false, error: true }))
    // A newer load replaces this one, so a slow, older answer is ignored.
    return () => {
      current = false
    }
  }, [version])

  return { ...state, reload }
}

async function fetchActiveBuses() {
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, buses(bus_number), schedules(routes(name, service_type))')
    .eq('status', 'active')
    .eq('trip_date', kuwaitToday())
  if (error) throw error

  // One small query per running bus for just its newest row, rather than
  // downloading every position the bus has sent today.
  const latest = await Promise.all(
    (trips || []).map((trip) =>
      supabase
        .from('bus_locations')
        .select('latitude, longitude, recorded_at')
        .eq('trip_id', trip.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
    )
  )
  const failed = latest.find((result) => result.error)
  if (failed) throw failed.error

  return (trips || []).map((trip, i) => {
    const row = latest[i].data?.[0]
    const route = trip.schedules?.routes
    return {
      tripId: trip.id,
      busNumber: trip.buses?.bus_number ?? '?',
      routeName: route?.name ?? '',
      serviceType: route?.service_type ?? null,
      location: row
        ? { latitude: row.latitude, longitude: row.longitude, recordedAt: row.recorded_at }
        : null,
    }
  })
}

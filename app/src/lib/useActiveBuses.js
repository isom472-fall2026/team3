import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { kuwaitToday } from './kuwaitTime.js'

// If live updates cannot connect, ask again this often instead, so a bus
// still moves on screen within 5 seconds of sending its position.
const FALLBACK_POLL_MS = 5 * 1000

// Today's running buses, each with its latest reported position, kept up to
// date live. Shared by the live map (#31) and the bus-info pages (#35, #36, #48).
//
// Returns { buses, loading, error, reload }, where each bus is
//   { tripId, busNumber, routeName, serviceType,
//     location: { latitude, longitude, recordedAt } | null }
export function useActiveBuses() {
  const [state, setState] = useState({ buses: [], loading: true, error: false })
  const [version, setVersion] = useState(0)
  const [live, setLive] = useState(false)
  const busesRef = useRef(state.buses)

  // Asks for a fresh load; the effect below does the loading.
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    busesRef.current = state.buses
  }, [state.buses])

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

  // Live updates: a new position moves its bus at once; any change to a trip
  // (started, finished, cancelled) reloads the list.
  useEffect(() => {
    const channel = supabase
      .channel('active-buses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bus_locations' }, ({ new: row }) => {
        if (!busesRef.current.some((bus) => bus.tripId === row.trip_id)) {
          reload() // a trip this page does not know yet
          return
        }
        setState((prev) => ({ ...prev, buses: prev.buses.map((bus) => withNewerLocation(bus, row)) }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, reload)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))

    return () => {
      supabase.removeChannel(channel)
    }
  }, [reload])

  useEffect(() => {
    if (live) return undefined
    const id = setInterval(reload, FALLBACK_POLL_MS)
    return () => clearInterval(id)
  }, [live, reload])

  return { ...state, reload }
}

// Positions can arrive out of order; only a newer one replaces the shown one.
function withNewerLocation(bus, row) {
  if (bus.tripId !== row.trip_id) return bus
  if (bus.location && Date.parse(row.recorded_at) < Date.parse(bus.location.recordedAt)) return bus
  return { ...bus, location: { latitude: row.latitude, longitude: row.longitude, recordedAt: row.recorded_at } }
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

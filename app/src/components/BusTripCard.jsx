import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import { supabase } from '../lib/supabase.js'

function BusTripCard({ bus }) {
  const map = useMap()
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Tapping anywhere outside the card closes it (#48 criterion 6)
  useEffect(() => {
    function handleOutsideTap(e) {
      const cardEl = document.getElementById(`bus-trip-card-${bus.tripId}`)
      if (cardEl && !cardEl.contains(e.target) && !e.target.closest('.bus-marker')) {
        map.closePopup()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideTap)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleOutsideTap)
    }
  }, [map, bus.tripId])

  useEffect(() => {
    let isMounted = true

    async function loadTripDetails() {
      try {
        setLoading(true)
        setError(false)

        // Load the trip with bus number, route, and schedule IDs
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('id, schedule_id, bus_id, status, buses(bus_number), schedules(id, route_id, routes(id, name))')
          .eq('id', bus.tripId)
          .maybeSingle()

        if (tripError || !trip) {
          if (isMounted) {
            setError(true)
            setLoading(false)
          }
          return
        }

        // If trips.status is empty or not one of allowed values (#48 criterion 10)
        const VALID_STATUSES = new Set(['scheduled', 'active', 'completed', 'cancelled'])
        const status = trip.status ? String(trip.status).trim() : ''
        if (!status || !VALID_STATUSES.has(status)) {
          if (isMounted) {
            setError(true)
            setLoading(false)
          }
          return
        }

        // bus_id or schedule_id points to a row that cannot be read (#48 criterion 12)
        if (!trip.buses || !trip.schedules) {
          if (isMounted) {
            setError(true)
            setLoading(false)
          }
          return
        }

        const routeId = trip.schedules?.routes?.id || trip.schedules?.route_id
        const scheduleId = trip.schedule_id

        // Load route stops (in sequence), trip stop updates, and scheduled stop times in parallel
        const [stopsRes, updatesRes, schedRes] = await Promise.all([
          routeId
            ? supabase
                .from('routes_stops')
                .select('id, sequence_order, stop_id, stops(name)')
                .eq('route_id', routeId)
                .order('sequence_order', { ascending: true })
            : { data: [] },
          supabase
            .from('trip_stop_updates')
            .select('routes_stop_id, actual_arrival_time, actual_departure_time')
            .eq('trips_id', trip.id),
          scheduleId
            ? supabase
                .from('scheduled_stop_times')
                .select('route_stop_id, expected_arrival_time')
                .eq('schedule_id', scheduleId)
            : { data: [] },
        ])

        if (stopsRes.error || updatesRes.error || schedRes.error) {
          if (isMounted) {
            setError(true)
            setLoading(false)
          }
          return
        }

        const routeStops = stopsRes.data || []
        const updates = updatesRes.data || []
        const scheduledStopTimes = schedRes.data || []

        const updatesMap = new Map(updates.map((u) => [u.routes_stop_id, u]))

        // Sort stops along the route in sequence order
        const sortedRouteStops = [...routeStops].sort(
          (a, b) => Number(a.sequence_order) - Number(b.sequence_order)
        )

        // Check if trips.status is 'completed' or route's last stop has actual_arrival_time (#48 criterion 8)
        const lastStop = sortedRouteStops.length > 0 ? sortedRouteStops[sortedRouteStops.length - 1] : null
        const lastStopArrived = Boolean(lastStop && updatesMap.get(lastStop.id)?.actual_arrival_time)
        const isCompleted = trip.status === 'completed' || lastStopArrived

        // Stop where bus has arrived but not departed yet (#48 criterion 5)
        const atStop = sortedRouteStops.find((rs) => {
          const u = updatesMap.get(rs.id)
          return Boolean(u?.actual_arrival_time) && !u?.actual_departure_time
        })

        // Lowest routes_stops.sequence_order on the route with no actual_arrival_time for this trip (#48 criterion 4)
        const nextStop = sortedRouteStops.find(
          (rs) => !updatesMap.get(rs.id)?.actual_arrival_time
        )

        let stopText = null
        let hasNextStop = false

        if (trip.status === 'cancelled') {
          stopText = 'Trip cancelled'
          hasNextStop = false
        } else if (sortedRouteStops.length === 0) {
          stopText = 'No stops listed for this route'
          hasNextStop = false
        } else if (isCompleted) {
          stopText = 'Last stop reached'
          hasNextStop = false
        } else if (atStop) {
          stopText = `At ${atStop.stops?.name ?? ''}`
          hasNextStop = false
        } else if (nextStop) {
          stopText = nextStop.stops?.name ?? null
          hasNextStop = true
        }

        // Scheduled time is expected_arrival_time where schedule_id = trip's schedule_id and route_stop_id = next stop
        const scheduledRow = hasNextStop
          ? scheduledStopTimes.find((st) => st.route_stop_id === nextStop.id)
          : null

        const rawExpectedTime = scheduledRow?.expected_arrival_time
        const hasScheduledTime = Boolean(rawExpectedTime && String(rawExpectedTime).trim())

        if (isMounted) {
          setDetails({
            busNumber: trip.buses?.bus_number ?? bus.busNumber,
            routeName: trip.schedules?.routes?.name ?? bus.routeName,
            stopText,
            hasNextStop,
            scheduledTime: hasScheduledTime ? rawExpectedTime : null,
          })
          setLoading(false)
        }
      } catch {
        if (isMounted) {
          setError(true)
          setLoading(false)
        }
      }
    }

    loadTripDetails()

    return () => {
      isMounted = false
    }
  }, [bus.tripId, bus.busNumber, bus.routeName])

  const busNumber = details?.busNumber ?? bus.busNumber
  const routeName = details?.routeName ?? bus.routeName
  const stopText = details?.stopText
  const scheduledTime = details?.scheduledTime
  const hasNextStop = details?.hasNextStop

  return (
    <div className="bus-trip-card" id={`bus-trip-card-${bus.tripId}`}>
      <div className="bus-trip-card-header">
        <strong>Bus {busNumber}</strong>
        {routeName && <span> · {routeName}</span>}
      </div>
      {loading ? (
        <div className="bus-trip-card-status">Loading…</div>
      ) : error ? (
        <div className="bus-trip-card-status">Trip details unavailable</div>
      ) : (
        <div className="bus-trip-card-body">
          {stopText && (
            <div className="bus-trip-stop" id="bus-trip-next-stop">
              <span className="bus-trip-stop-name">{stopText}</span>
            </div>
          )}
          {hasNextStop && (
            <div className="bus-trip-scheduled" data-expected-arrival={scheduledTime || ''}>
              {scheduledTime ? (
                <>
                  <span className="bus-trip-label">Scheduled:</span> {formatTime(scheduledTime)}
                </>
              ) : (
                <span className="bus-trip-no-time">No scheduled time</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

export default BusTripCard

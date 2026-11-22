import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import { supabase } from '../lib/supabase.js'
import { kuwaitClock } from '../lib/kuwaitTime.js'
import NextStopsList from './NextStopsList.jsx'

function BusTripCard({ bus, isGuest }) {
  const map = useMap()
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const isInitialRef = useRef(true)

  useEffect(() => {
    isInitialRef.current = true
  }, [bus.tripId])

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
        if (isInitialRef.current) {
          setLoading(true)
          setError(false)
        }

        // Load the trip with bus number, route, schedule IDs, and actual_start
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('id, schedule_id, bus_id, status, actual_start, buses(bus_number), schedules(id, route_id, routes(id, name))')
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

        // Guests (#131) do not see arrivals or expected times: the next stop comes from
        // arrivals, so only the bus, route and a cancelled trip are shown.
        if (isGuest) {
          if (isMounted) {
            setDetails({
              busNumber: trip.buses?.bus_number ?? bus.busNumber,
              routeName: trip.schedules?.routes?.name ?? bus.routeName,
              stopText: trip.status === 'cancelled' ? 'Trip cancelled' : null,
              hasNextStop: false,
              scheduledTime: null,
              guest: trip.status !== 'cancelled',
            })
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
            .select('trips_id, routes_stop_id, actual_arrival_time, actual_departure_time')
            .eq('trips_id', trip.id),
          scheduleId
            ? supabase
                .from('scheduled_stop_times')
                .select('route_stop_id, expected_arrival_time')
                .eq('schedule_id', scheduleId)
            : { data: [] },
        ])

        // #100 criterion 8: flag if stop progress data cannot be loaded
        const stopsLoadError = Boolean(stopsRes?.error || updatesRes?.error)

        const routeStops = stopsRes.data || []
        // #100 criterion 7: rows from any other trip never mark a stop on this list
        const updates = (updatesRes.data || []).filter((u) => u.trips_id === trip.id)
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

        const actualStartMs = trip.actual_start ? Date.parse(trip.actual_start) : NaN
        const hasValidStart = Number.isFinite(actualStartMs)

        // #100: attach each stop's actual_arrival_time; criterion 5 & 6 checks
        const stopsWithProgress = sortedRouteStops.map((rs) => {
          const update = updatesMap.get(rs.id)
          const raw = update?.actual_arrival_time
          const arrivalMs = raw != null && String(raw).trim() !== '' ? Date.parse(raw) : NaN
          const isValidArrival = Number.isFinite(arrivalMs)

          // #100 criterion 6: an actual_arrival_time earlier than trips.actual_start is ignored
          const isEarlierThanStart = hasValidStart && isValidArrival && arrivalMs < actualStartMs

          const actualArrivalTime = isValidArrival && !isEarlierThanStart ? raw : null
          return {
            ...rs,
            actualArrivalTime,
          }
        })

        if (isMounted) {
          setDetails({
            busNumber: trip.buses?.bus_number ?? bus.busNumber,
            routeName: trip.schedules?.routes?.name ?? bus.routeName,
            stopText,
            hasNextStop,
            scheduledTime: hasScheduledTime ? rawExpectedTime : null,
            stops: stopsWithProgress,
            stopsLoadError,
          })
          setLoading(false)
          isInitialRef.current = false
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
  }, [bus.tripId, bus.busNumber, bus.routeName, isGuest, version])

  // #100 criterion 4: a new trip_stop_updates row marks its stop within 5 seconds without reloading
  useEffect(() => {
    if (!bus.tripId) return

    const channel = supabase
      .channel(`bus-trip-stops-${bus.tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_stop_updates',
          filter: `trips_id=eq.${bus.tripId}`,
        },
        (payload) => {
          // #100 criterion 7: rows from any other trip never mark a stop on this list
          if (payload?.new && payload.new.trips_id && payload.new.trips_id !== bus.tripId) {
            return
          }
          setVersion((v) => v + 1)
        }
      )
      .subscribe()

    const pollId = setInterval(() => {
      setVersion((v) => v + 1)
    }, 4000)

    return () => {
      clearInterval(pollId)
      supabase.removeChannel(channel)
    }
  }, [bus.tripId])

  const busNumber = details?.busNumber ?? bus.busNumber
  const routeName = details?.routeName ?? bus.routeName
  const stopText = details?.stopText
  const scheduledTime = details?.scheduledTime
  const hasNextStop = details?.hasNextStop
  const stops = details?.stops || []
  const stopsLoadError = details?.stopsLoadError

  return (
    <div className="bus-trip-card" id={`bus-trip-card-${bus.tripId}`}>
      <div className="bus-trip-card-header">
        <strong>Bus {busNumber}</strong>
        {routeName && <span> · {routeName}</span>}
      </div>
      {loading ? (
        <div className="bus-trip-card-status">Loading…</div>
      ) : error ? (
        <div className="bus-trip-card-status">
          <div>Trip details unavailable</div>
          <div className="bus-trip-stops-error" id="bus-trip-stops-error">
            Stop progress could not be loaded. Try again.
          </div>
        </div>
      ) : (
        <div className="bus-trip-card-body">
          {stopText && (
            <div className="bus-trip-stop" id="bus-trip-next-stop">
              <span className="bus-trip-stop-name">{stopText}</span>
            </div>
          )}
          {details?.guest && (
            <div className="bus-trip-no-time" id="guest-sign-in-notice">
              Sign in with your KU email to see arrival times and delays.
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
          {stopsLoadError ? (
            <div className="bus-trip-stops-error" id="bus-trip-stops-error">
              Stop progress could not be loaded. Try again.
            </div>
          ) : stops.length > 0 ? (
            <ol className="bus-trip-stops-list" id="bus-trip-stops-list">
              {stops.map((s) => (
                <li key={s.id} className="bus-trip-stop-item">
                  <span className="bus-trip-stop-name">{s.stops?.name}</span>{' '}
                  <span className="bus-trip-stop-status">
                    {s.actualArrivalTime
                      ? `Reached ${kuwaitClock(s.actualArrivalTime)}`
                      : 'Not reached yet'}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
          <NextStopsList tripId={bus.tripId} isGuest={isGuest} />
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

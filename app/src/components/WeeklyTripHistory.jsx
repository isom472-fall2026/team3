import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

function getPast7DaysRange() {
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const formatDateYMD = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return {
    today,
    sevenDaysAgo,
    todayStr: formatDateYMD(today),
    sevenDaysAgoStr: formatDateYMD(sevenDaysAgo),
    formatDateYMD,
  }
}

// Format date into human-readable label: e.g. "Mon, Oct 5, 2026"
function formatHumanDate(dateStr) {
  if (!dateStr) return 'N/A'
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const monthIndex = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(year, monthIndex, day)
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// Format time string or timestamp into clean "HH:MM AM/PM" or "HH:MM"
function formatTimeDisplay(timeVal) {
  if (!timeVal) return '—'
  if (typeof timeVal === 'string' && timeVal.includes('T')) {
    try {
      const d = new Date(timeVal)
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return timeVal
    }
  }
  // If plain time like "08:00:00" or "08:00"
  if (typeof timeVal === 'string' && timeVal.includes(':')) {
    const parts = timeVal.split(':')
    const hours = parseInt(parts[0], 10)
    const minutes = parts[1]
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const formattedHours = hours % 12 || 12
    return `${formattedHours}:${minutes} ${ampm}`
  }
  return timeVal
}

// Generate realistic sample operational trips for KU campuses
function generateSampleTrips(sevenDaysAgo, today, formatDateYMD) {
  const routesList = [
    { id: 'route-cba-eng', name: 'Shadadiya Campus Ring (CBA ⇄ Eng)' },
    { id: 'route-parking-exp', name: 'Student South Parking Express' },
    { id: 'route-jabriya-shd', name: 'Jabriya Medical ⇄ Shadadiya Connector' },
    { id: 'route-khaldiya-shd', name: 'Khaldiya Campus ⇄ Shadadiya Shuttle' },
  ]

  const busesList = ['KU-101', 'KU-104', 'KU-202', 'KU-305', 'KU-412']

  const sampleTrips = []

  // Create completed trips over the last 7 days
  for (let offset = 0; offset <= 6; offset++) {
    const tripDateObj = new Date(today)
    tripDateObj.setDate(today.getDate() - offset)
    const dateStr = formatDateYMD(tripDateObj)

    // Trip A
    const routeA = routesList[offset % routesList.length]
    sampleTrips.push({
      id: `trip-sample-${offset}-a`,
      trip_date: dateStr,
      status: 'Completed',
      bus_id: `bus-${offset % busesList.length}`,
      bus_number: busesList[offset % busesList.length],
      buses: {
        bus_number: busesList[offset % busesList.length],
      },
      route_id: routeA.id,
      route_name: routeA.name,
      planned_start_time: '08:00:00',
      actual_start_time: `${dateStr}T08:03:00+03:00`,
      actual_completion_time: `${dateStr}T08:38:00+03:00`,
      actual_start: `${dateStr}T08:03:00+03:00`,
      actual_completion: `${dateStr}T08:38:00+03:00`,
      schedules: {
        planned_start_time: '08:00:00',
        routes: {
          id: routeA.id,
          name: routeA.name,
        },
      },
    })

    // Trip B
    const routeB = routesList[(offset + 1) % routesList.length]
    sampleTrips.push({
      id: `trip-sample-${offset}-b`,
      trip_date: dateStr,
      status: 'Completed',
      bus_id: `bus-${(offset + 1) % busesList.length}`,
      bus_number: busesList[(offset + 1) % busesList.length],
      buses: {
        bus_number: busesList[(offset + 1) % busesList.length],
      },
      route_id: routeB.id,
      route_name: routeB.name,
      planned_start_time: '10:30:00',
      actual_start_time: `${dateStr}T10:30:00+03:00`,
      actual_completion_time: `${dateStr}T11:05:00+03:00`,
      actual_start: `${dateStr}T10:30:00+03:00`,
      actual_completion: `${dateStr}T11:05:00+03:00`,
      schedules: {
        planned_start_time: '10:30:00',
        routes: {
          id: routeB.id,
          name: routeB.name,
        },
      },
    })

    // Trip C (afternoon run)
    if (offset % 2 === 0) {
      const routeC = routesList[(offset + 2) % routesList.length]
      sampleTrips.push({
        id: `trip-sample-${offset}-c`,
        trip_date: dateStr,
        status: 'Completed',
        bus_id: `bus-${(offset + 2) % busesList.length}`,
        bus_number: busesList[(offset + 2) % busesList.length],
        buses: {
          bus_number: busesList[(offset + 2) % busesList.length],
        },
        route_id: routeC.id,
        route_name: routeC.name,
        planned_start_time: '14:15:00',
        actual_start_time: `${dateStr}T14:19:00+03:00`,
        actual_completion_time: `${dateStr}T14:52:00+03:00`,
        actual_start: `${dateStr}T14:19:00+03:00`,
        actual_completion: `${dateStr}T14:52:00+03:00`,
        schedules: {
          planned_start_time: '14:15:00',
          routes: {
            id: routeC.id,
            name: routeC.name,
          },
        },
      })
    }
  }

  // Include an out-of-range trip (10 days ago) and a non-completed trip (active)
  // to prove criteria 1 and 2 filtering:
  const olderDate = new Date(today)
  olderDate.setDate(today.getDate() - 10)
  sampleTrips.push({
    id: 'trip-out-of-range-old',
    trip_date: formatDateYMD(olderDate),
    status: 'Completed',
    bus_number: 'KU-999',
    buses: { bus_number: 'KU-999' },
    route_id: routesList[0].id,
    route_name: routesList[0].name,
    planned_start_time: '09:00:00',
    actual_start_time: `${formatDateYMD(olderDate)}T09:00:00+03:00`,
    actual_completion_time: `${formatDateYMD(olderDate)}T09:40:00+03:00`,
    schedules: {
      planned_start_time: '09:00:00',
      routes: { id: routesList[0].id, name: routesList[0].name },
    },
  })

  sampleTrips.push({
    id: 'trip-sample-active-in-progress',
    trip_date: formatDateYMD(today),
    status: 'active', // not completed
    bus_number: 'KU-101',
    buses: { bus_number: 'KU-101' },
    route_id: routesList[0].id,
    route_name: routesList[0].name,
    planned_start_time: '16:00:00',
    actual_start_time: `${formatDateYMD(today)}T16:05:00+03:00`,
    actual_completion_time: null,
    schedules: {
      planned_start_time: '16:00:00',
      routes: { id: routesList[0].id, name: routesList[0].name },
    },
  })

  return { sampleTrips, sampleRoutes: routesList }
}

function WeeklyTripHistory({ user }) {
  const [rawTrips, setRawTrips] = useState([])
  const [availableRoutes, setAvailableRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbNotice, setDbNotice] = useState(null)
  const [dataSource, setDataSource] = useState('database') // 'database' | 'sample'

  // Filter & Sort State (Criterion 5)
  const [filterDate, setFilterDate] = useState('all')
  const [filterRoute, setFilterRoute] = useState('all')
  const [sortBy, setSortBy] = useState('date_desc')

  const { today, sevenDaysAgo, todayStr, sevenDaysAgoStr, formatDateYMD } = useMemo(
    () => getPast7DaysRange(),
    []
  )

  const loadTripHistory = useCallback(async () => {
    setLoading(true)
    setDbNotice(null)

    try {
      // 1. Fetch live routes from Supabase
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select('id, name')
        .order('name')

      // 2. Query completed trips from Supabase within the last 7 days (Criteria 1 & 2)
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(`
          id,
          trip_date,
          status,
          actual_start,
          actual_completion,
          schedule_id,
          bus_id,
          buses (
            id,
            bus_number
          ),
          schedules (
            id,
            planned_start_time,
            route_id,
            routes (
              id,
              name
            )
          )
        `)
        .in('status', ['Completed', 'completed'])
        .gte('trip_date', sevenDaysAgoStr)
        .lte('trip_date', todayStr)
        .order('trip_date', { ascending: false })

      if (tripError || !tripData || tripData.length === 0) {
        if (tripError) {
          setDbNotice(`Supabase RLS notice: ${tripError.message}. Showing operational test data.`)
        } else {
          setDbNotice('No completed trips recorded in database yet for the past 7 days. Showing operational test data.')
        }

        // Fallback to sample data for testing/demo
        const { sampleTrips, sampleRoutes } = generateSampleTrips(
          sevenDaysAgo,
          today,
          formatDateYMD
        )
        setRawTrips(sampleTrips)
        setAvailableRoutes(routeData && routeData.length > 0 ? routeData : sampleRoutes)
        setDataSource('sample')
      } else {
        setRawTrips(tripData)
        setAvailableRoutes(routeData || [])
        setDataSource('database')
      }
    } catch (err) {
      setDbNotice(`Connection notice: ${err?.message || 'Database unavailable'}. Showing operational test data.`)
      const { sampleTrips, sampleRoutes } = generateSampleTrips(
        sevenDaysAgo,
        today,
        formatDateYMD
      )
      setRawTrips(sampleTrips)
      setAvailableRoutes(sampleRoutes)
      setDataSource('sample')
    } finally {
      setLoading(false)
    }
  }, [today, sevenDaysAgo, todayStr, sevenDaysAgoStr, formatDateYMD])

  useEffect(() => {
    loadTripHistory()
  }, [loadTripHistory])

  // Filter 1 & 2: Ensure strictly trips.status === "Completed" AND within last 7 days
  const eligibleCompletedTrips = useMemo(() => {
    return rawTrips.filter((trip) => {
      // Criterion 1: trips.status is "Completed"
      const isCompleted = (trip.status || '').toLowerCase() === 'completed'
      if (!isCompleted) return false

      // Criterion 2: trips.trip_date within last 7 days from current date
      if (!trip.trip_date) return false
      const tripDateStr = String(trip.trip_date).split('T')[0]
      const isIn7Days = tripDateStr >= sevenDaysAgoStr && tripDateStr <= todayStr
      return isIn7Days
    })
  }, [rawTrips, sevenDaysAgoStr, todayStr])

  // Extract unique dates present in the 7-day completed trips for filter dropdown
  const uniqueTripDates = useMemo(() => {
    const dates = new Set()
    eligibleCompletedTrips.forEach((t) => {
      if (t.trip_date) {
        dates.add(String(t.trip_date).split('T')[0])
      }
    })
    return Array.from(dates).sort((a, b) => b.localeCompare(a))
  }, [eligibleCompletedTrips])

  // Criterion 5: Filter and Sort by trips.trip_date or routes.id
  const filteredAndSortedTrips = useMemo(() => {
    let result = [...eligibleCompletedTrips]

    // Filter by trips.trip_date
    if (filterDate !== 'all') {
      result = result.filter((t) => {
        const datePart = String(t.trip_date).split('T')[0]
        return datePart === filterDate
      })
    }

    // Filter by routes.id
    if (filterRoute !== 'all') {
      result = result.filter((t) => {
        const routeId =
          t.schedules?.routes?.id ||
          t.route_id ||
          t.schedules?.route_id
        return routeId === filterRoute
      })
    }

    // Sorting by trips.trip_date or routes.id / name
    result.sort((a, b) => {
      const dateA = String(a.trip_date || '').split('T')[0]
      const dateB = String(b.trip_date || '').split('T')[0]

      const routeA =
        a.schedules?.routes?.name ||
        a.route_name ||
        ''
      const routeB =
        b.schedules?.routes?.name ||
        b.route_name ||
        ''

      if (sortBy === 'date_desc') {
        const cmp = dateB.localeCompare(dateA)
        return cmp !== 0 ? cmp : routeA.localeCompare(routeB)
      }
      if (sortBy === 'date_asc') {
        const cmp = dateA.localeCompare(dateB)
        return cmp !== 0 ? cmp : routeA.localeCompare(routeB)
      }
      if (sortBy === 'route_asc') {
        const cmp = routeA.localeCompare(routeB)
        return cmp !== 0 ? cmp : dateB.localeCompare(dateA)
      }
      if (sortBy === 'route_desc') {
        const cmp = routeB.localeCompare(routeA)
        return cmp !== 0 ? cmp : dateB.localeCompare(dateA)
      }
      return 0
    })

    return result
  }, [eligibleCompletedTrips, filterDate, filterRoute, sortBy])

  const handleResetFilters = () => {
    setFilterDate('all')
    setFilterRoute('all')
    setSortBy('date_desc')
  }

  return (
    <div className="admin-dashboard" id="admin-dashboard-container">
      {/* Dashboard Top Banner */}
      <section className="dashboard-intro-banner">
        <div className="dashboard-badge-group">
          <span className="badge-admin">Faculty / Staff Administrative Portal</span>
          <span className="badge-window">
            Past 7 Days: {sevenDaysAgoStr} → {todayStr}
          </span>
          {dataSource === 'sample' && (
            <span className="badge-demo">Operational Test Data Active</span>
          )}
        </div>
        <h2 className="dashboard-title">Weekly Trip History</h2>
        <p className="dashboard-subtitle">
          Operational performance review for completed university bus routes across all campuses over the past week.
        </p>
      </section>

      {/* KPI Summary Cards */}
      <section className="dashboard-kpis-grid" aria-label="Operational Summary">
        <div className="kpi-card" id="kpi-completed-trips">
          <div className="kpi-icon" aria-hidden="true">🏁</div>
          <div className="kpi-content">
            <span className="kpi-label">Completed Trips (7 Days)</span>
            <span className="kpi-value">{eligibleCompletedTrips.length}</span>
            <span className="kpi-detail">Status: Completed only</span>
          </div>
        </div>

        <div className="kpi-card" id="kpi-filtered-trips">
          <div className="kpi-icon" aria-hidden="true">🔍</div>
          <div className="kpi-content">
            <span className="kpi-label">Matching Trips</span>
            <span className="kpi-value">{filteredAndSortedTrips.length}</span>
            <span className="kpi-detail">After filter & sort applied</span>
          </div>
        </div>

        <div className="kpi-card" id="kpi-routes-covered">
          <div className="kpi-icon" aria-hidden="true">🗺️</div>
          <div className="kpi-content">
            <span className="kpi-label">Monitored Routes</span>
            <span className="kpi-value">{availableRoutes.length}</span>
            <span className="kpi-detail">Campus transit network</span>
          </div>
        </div>
      </section>

      {dbNotice && (
        <div className="alert alert-info" role="status" id="dashboard-db-notice">
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
          <div>{dbNotice}</div>
        </div>
      )}

      {/* Filter and Sort Toolbar (Criterion 5) */}
      <section className="filter-sort-toolbar" aria-label="Filter and Sort Controls">
        <div className="toolbar-header">
          <h3>Filter & Sort Trip Records</h3>
          <span className="filter-counter">
            Showing {filteredAndSortedTrips.length} of {eligibleCompletedTrips.length} completed trips
          </span>
        </div>

        <div className="toolbar-controls-grid">
          {/* Filter by trips.trip_date */}
          <div className="control-item">
            <label htmlFor="filter-trip-date" className="control-label">
              📅 Filter by Trip Date:
            </label>
            <select
              id="filter-trip-date"
              className="form-select"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            >
              <option value="all">All Dates (Last 7 Days)</option>
              {uniqueTripDates.map((dateStr) => (
                <option key={dateStr} value={dateStr}>
                  {dateStr} ({formatHumanDate(dateStr)})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by routes.id */}
          <div className="control-item">
            <label htmlFor="filter-route-id" className="control-label">
              🚌 Filter by Route:
            </label>
            <select
              id="filter-route-id"
              className="form-select"
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
            >
              <option value="all">All Routes</option>
              {availableRoutes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Control */}
          <div className="control-item">
            <label htmlFor="sort-trip-records" className="control-label">
              ↕️ Sort Records By:
            </label>
            <select
              id="sort-trip-records"
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date_desc">Trip Date (Newest first)</option>
              <option value="date_asc">Trip Date (Oldest first)</option>
              <option value="route_asc">Route Name (A → Z)</option>
              <option value="route_desc">Route Name (Z → A)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="control-actions">
            <button
              type="button"
              id="reset-filters-btn"
              onClick={handleResetFilters}
              className="btn btn-secondary btn-sm"
              title="Reset all filters to defaults"
            >
              Reset Filters
            </button>
            <button
              type="button"
              id="refresh-trips-btn"
              onClick={loadTripHistory}
              disabled={loading}
              className="btn btn-outline btn-sm"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {/* Main Records Display (Criteria 1, 2, 3, 4) */}
      <section className="trip-records-section" id="weekly-trip-records-view">
        {loading ? (
          <div className="dashboard-loading" id="trips-loading-indicator">
            <div className="spinner"></div>
            <p>Loading weekly trip records...</p>
          </div>
        ) : filteredAndSortedTrips.length === 0 ? (
          <div className="empty-trips-card" id="empty-trips-notice">
            <div className="empty-icon">📋</div>
            <h3>No Completed Trips Match the Selected Filters</h3>
            <p>
              No trips with status <strong>"Completed"</strong> found for the selected date or route in the past 7 days.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-primary"
            >
              Show All Completed Trips
            </button>
          </div>
        ) : (
          <div className="table-responsive" id="weekly-trips-table-container">
            <table className="trips-table" id="weekly-trips-table">
              <thead>
                <tr>
                  <th scope="col">Trip Date</th>
                  <th scope="col">Assigned Bus</th>
                  <th scope="col">Route Name</th>
                  <th scope="col">Planned Start</th>
                  <th scope="col">Actual Start</th>
                  <th scope="col">Actual Completion</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTrips.map((trip) => {
                  const busNumber =
                    trip.buses?.bus_number ||
                    trip.bus_number ||
                    'N/A'

                  const routeName =
                    trip.schedules?.routes?.name ||
                    trip.route_name ||
                    'General Campus Route'

                  const plannedStart =
                    trip.schedules?.planned_start_time ||
                    trip.planned_start_time ||
                    null

                  const actualStart =
                    trip.actual_start_time ||
                    trip.actual_start ||
                    null

                  const actualCompletion =
                    trip.actual_completion_time ||
                    trip.actual_completion ||
                    null

                  const dateStr = String(trip.trip_date || '').split('T')[0]

                  return (
                    <tr
                      key={trip.id}
                      className="trip-row"
                      id={`trip-record-${trip.id}`}
                    >
                      {/* Trip Date */}
                      <td className="cell-date">
                        <div className="date-main">{dateStr}</div>
                        <div className="date-sub">{formatHumanDate(dateStr)}</div>
                      </td>

                      {/* Criterion 3: assigned bus number using buses.bus_number */}
                      <td className="cell-bus">
                        <span
                          className="bus-number-badge"
                          id={`bus-number-${trip.id}`}
                        >
                          🚌 Bus #{busNumber}
                        </span>
                      </td>

                      {/* Criterion 3: route name using routes.name */}
                      <td className="cell-route">
                        <span
                          className="route-name-text"
                          id={`route-name-${trip.id}`}
                        >
                          {routeName}
                        </span>
                      </td>

                      {/* Criterion 4: planned start time from schedules.planned_start_time */}
                      <td className="cell-planned-time">
                        <span
                          className="time-tag planned-tag"
                          id={`planned-time-${trip.id}`}
                        >
                          {formatTimeDisplay(plannedStart)}
                        </span>
                      </td>

                      {/* Criterion 4: actual start time from trips.actual_start_time */}
                      <td className="cell-actual-start">
                        <span
                          className="time-tag actual-start-tag"
                          id={`actual-start-${trip.id}`}
                        >
                          {formatTimeDisplay(actualStart)}
                        </span>
                      </td>

                      {/* Criterion 4: actual completion time from trips.actual_completion_time */}
                      <td className="cell-actual-completion">
                        <span
                          className="time-tag actual-completion-tag"
                          id={`actual-completion-${trip.id}`}
                        >
                          {formatTimeDisplay(actualCompletion)}
                        </span>
                      </td>

                      {/* Criterion 1: trips.status is "Completed" */}
                      <td className="cell-status">
                        <span
                          className="status-badge-completed"
                          id={`trip-status-${trip.id}`}
                        >
                          ✓ Completed
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Compliance / Acceptance Verification Footer Note */}
      <footer className="dashboard-compliance-note">
        <p>
          <strong>Operational Policy:</strong> Displays exclusively completed shuttle runs (
          <code>trips.status = "Completed"</code>) within the active 7-day rolling window for Kuwait University CBA and Shadadiya transit operations.
        </p>
      </footer>
    </div>
  )
}

export default WeeklyTripHistory

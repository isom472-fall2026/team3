import RoutesPage from './RoutesPage.jsx'
import MapPage from './MapPage.jsx'
import BusesPage from './BusesPage.jsx'
import HistoryPage from './HistoryPage.jsx'
import StopsPage from './StopsPage.jsx'
import SchedulePage from './SchedulePage.jsx'
import RouteStopsPage from './RouteStopsPage.jsx'
import StartTripPage from './StartTripPage.jsx'
import ActiveTripBusPage from './ActiveTripBusPage.jsx'

// Every signed-in page, in menu order. The first one is where a student lands after
// signing in, and where an unknown address goes. To add a page: one file here, one line below.
// staffOnly pages are hidden from the menu and unreachable for accounts not in staff_members.
export const pages = [
  { path: 'routes', label: '🗺️ Routes', component: RoutesPage },
  { path: 'map', label: '📍 Live map', component: MapPage },
  { path: 'schedule', label: '🕐 Schedule', component: SchedulePage },
  { path: 'route-stops', label: '📋 Route stops', component: RouteStopsPage },
  { path: 'buses', label: '🚌 Buses', component: BusesPage },
  { path: 'history', label: '📊 Weekly Trip History (Admin)', component: HistoryPage, staffOnly: true },
  { path: 'stops', label: '🚏 Stops', component: StopsPage },
  { path: 'active-trip-bus', label: '🚌 Active trip bus', component: ActiveTripBusPage },
  { path: 'start-trip', label: '▶️ Start a trip', component: StartTripPage, staffOnly: true },
]
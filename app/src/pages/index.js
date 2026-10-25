import RoutesPage from './RoutesPage.jsx'
import MapPage from './MapPage.jsx'
import BusesPage from './BusesPage.jsx'
import HistoryPage from './HistoryPage.jsx'
import StopsPage from './StopsPage.jsx'
import SchedulePage from './SchedulePage.jsx'
import StartTripPage from './StartTripPage.jsx'
import LastLocationUpdatePage from './LastLocationUpdatePage.jsx'

// Every signed-in page, in menu order. The first one is where a student lands after
// signing in, and where an unknown address goes. To add a page: one file here, one line below.
// staffOnly pages are hidden from the menu and unreachable for accounts not in staff_members.
export const pages = [
  { path: 'routes', label: '🗺️ Routes', component: RoutesPage },
  { path: 'map', label: '📍 Live map', component: MapPage },
  { path: 'schedule', label: '🕐 Schedule', component: SchedulePage },
  { path: 'buses', label: '🚌 Buses', component: BusesPage },
  { path: 'history', label: '📊 Weekly Trip History (Admin)', component: HistoryPage, staffOnly: true },
  { path: 'stops', label: '🚏 Stops', component: StopsPage },
  { path: 'last-location-update', label: '⏱️ Last location update', component: LastLocationUpdatePage },
  { path: 'start-trip', label: '▶️ Start a trip', component: StartTripPage, staffOnly: true },
]
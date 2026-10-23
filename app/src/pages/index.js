import RoutesPage from './RoutesPage.jsx'
import BusesPage from './BusesPage.jsx'
import HistoryPage from './HistoryPage.jsx'
import StartTripPage from './StartTripPage.jsx'

// Every signed-in page, in menu order. The first one is where a student lands after
// signing in, and where an unknown address goes. To add a page: one file here, one line below.
// staffOnly pages are hidden from the menu and unreachable for accounts not in staff_members.
export const pages = [
  { path: 'routes', label: '🗺️ Routes', component: RoutesPage },
  { path: 'buses', label: '🚌 Buses', component: BusesPage },
  { path: 'history', label: '📊 Weekly Trip History (Admin)', component: HistoryPage, staffOnly: true },
  { path: 'start-trip', label: '▶️ Start a trip', component: StartTripPage, staffOnly: true },
]

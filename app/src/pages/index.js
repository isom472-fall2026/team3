import RoutesPage from './RoutesPage.jsx'
import BusesPage from './BusesPage.jsx'
import HistoryPage from './HistoryPage.jsx'
import StopsPage from './StopsPage.jsx'

// Every signed-in page, in menu order. The first one is where a student lands after
// signing in, and where an unknown address goes. To add a page: one file here, one line below.
export const pages = [
  { path: 'routes', label: '🗺️ Routes', component: RoutesPage },
  { path: 'buses', label: '🚌 Buses', component: BusesPage },
  { path: 'history', label: '📊 Weekly Trip History (Admin)', component: HistoryPage },
  { path: 'stops', label: '🚏 Stops', component: StopsPage },
]

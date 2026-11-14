import RoutesPage from './RoutesPage.jsx'
import MapPage from './MapPage.jsx'
import BusesPage from './BusesPage.jsx'
import HistoryPage from './HistoryPage.jsx'
import StopsPage from './StopsPage.jsx'
import SchedulePage from './SchedulePage.jsx'
import DelaysPage from './DelaysPage.jsx'
import RouteStopsPage from './RouteStopsPage.jsx'
import StartTripPage from './StartTripPage.jsx'
import LastLocationUpdatePage from './LastLocationUpdatePage.jsx'
import ActiveTripBusPage from './ActiveTripBusPage.jsx'
import TestBusPage from './TestBusPage.jsx'
import StoppedLocationPage from './StoppedLocationPage.jsx'
import AddStopPage from './AddStopPage.jsx'
import AddRoutePage from './AddRoutePage.jsx'

// The tabs in the bottom bar (prototype v2), in order. Each page below names the tab it
// sits under; a tab opens its first page, and the pages of a tab are switched at the top.
// staffOnly tabs are hidden from accounts not in staff_members.
export const sections = [
  { id: 'routes', label: 'Routes', icon: 'routes' },
  { id: 'map', label: 'Live map', icon: 'map' },
  { id: 'stops', label: 'Stops', icon: 'stops' },
  { id: 'trips', label: 'Trips', icon: 'trips', staffOnly: true },
  { id: 'manage', label: 'Manage', icon: 'manage', staffOnly: true },
]

// Every signed-in page. The first one is where a student lands after signing in, and
// where an unknown address goes. To add a page: one file here, one line below.
// staffOnly pages are unreachable for accounts not in staff_members.
export const pages = [
  { path: 'routes', label: 'Routes', section: 'routes', component: RoutesPage },
  { path: 'route-stops', label: 'Route stops', section: 'routes', component: RouteStopsPage },
  { path: 'schedule', label: 'Schedule', section: 'routes', component: SchedulePage },
  { path: 'delays', label: 'Delays', section: 'routes', component: DelaysPage },

  { path: 'map', label: 'Live map', section: 'map', component: MapPage },
  { path: 'buses', label: 'Buses', section: 'map', component: BusesPage },
  { path: 'active-trip-bus', label: 'Active trip', section: 'map', component: ActiveTripBusPage },
  { path: 'last-location-update', label: 'Last update', section: 'map', component: LastLocationUpdatePage },

  { path: 'stops', label: 'Stops', section: 'stops', component: StopsPage },

  { path: 'start-trip', label: 'Start a trip', section: 'trips', component: StartTripPage, staffOnly: true },
  { path: 'test-bus', label: 'Test bus', section: 'trips', component: TestBusPage, staffOnly: true },
  { path: 'stopped-location', label: 'Stopped location', section: 'trips', component: StoppedLocationPage, staffOnly: true },
  { path: 'history', label: 'Trip history', section: 'trips', component: HistoryPage, staffOnly: true },
  { path: 'add-route', label: 'Add route', section: 'manage', component: AddRoutePage, staffOnly: true },
  { path: 'add-stop', label: 'Add stop', section: 'manage', component: AddStopPage, staffOnly: true },
]

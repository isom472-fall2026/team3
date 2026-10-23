// Where the map starts for each kind of route. Shared by every page that shows a map.

// Sabah Al-Salem University City, Shadadiya.
export const ON_CAMPUS_VIEW = { center: [29.2576, 47.8998], zoom: 15 }

// Wide enough to show the campus together with the residential areas
// the off-campus routes come from (Jabriya, Kuwait City).
export const OFF_CAMPUS_VIEW = { center: [29.3, 47.96], zoom: 11 }

export const MAP_VIEWS = {
  on_campus: ON_CAMPUS_VIEW,
  off_campus: OFF_CAMPUS_VIEW,
}


// A position outside these limits is not a real bus position in Kuwait
// (GPS error or bad data), so it is never drawn on the map.
const KUWAIT_LIMITS = { minLat: 28.5, maxLat: 30.1, minLng: 46.5, maxLng: 48.5 }

export function isInKuwait(latitude, longitude) {
  return (
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= KUWAIT_LIMITS.minLat && latitude <= KUWAIT_LIMITS.maxLat &&
    longitude >= KUWAIT_LIMITS.minLng && longitude <= KUWAIT_LIMITS.maxLng
  )
}

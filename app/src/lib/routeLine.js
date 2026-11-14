// Prototype v2 gives each route one colour everywhere: North is KU black, every other
// route KU blue. The routes table has no colour column, so it is read from the name.
export function routeLine(name) {
  return typeof name === 'string' && /north/i.test(name) ? 'north' : 'south'
}

export const ROUTE_COLOURS = { south: '#0EACE3', north: '#000000' }

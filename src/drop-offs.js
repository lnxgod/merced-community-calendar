import { localToday } from './dates.js';

// Directory entries have no required calendar date and never become events.
export function validDropOffLocation(location) {
  return location && ['id', 'title', 'location'].every(key => typeof location[key] === 'string' && location[key].trim())
    && ['coming-soon', 'accepting', 'closed'].includes(location.status);
}

export function selectDropOffLocations(locations, { query = '', city = 'all', now = new Date() } = {}) {
  const search = query.trim().toLowerCase();
  return locations.filter(location => validDropOffLocation(location)
    && location.status !== 'closed' && (!location.endDate || location.endDate >= localToday(now))
    && (city === 'all' || location.city === city)
    && (!search || [location.title, location.location, location.city, location.description]
      .filter(Boolean).join(' ').toLowerCase().includes(search)))
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

export function hasDropOffAddress(location) {
  const address = location.location?.trim();
  if (!address) return false;
  if (location.status === 'coming-soon') return /(?:^|,\s*)\d+[A-Z]?(?:-\d+)?\s+\S/i.test(address);
  return location.status === 'accepting'
    && !/^(?:coming soon|tbd|to be (?:announced|confirmed)|(?:address|location) (?:coming soon|tbd|to be (?:announced|confirmed)))\.?$/i.test(address);
}

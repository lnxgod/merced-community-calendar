import { pacificDateTime } from './dates.js';

export function isHalloweenCandyEvent(event) {
  const text = `${event.title ?? ''} ${event.description ?? ''}`.toLowerCase().replace(/[‐‑‒–—]/g, '-');
  return /\b(?:trunk|trick)[\s-]+or[\s-]+treat(?:ing)?\b/.test(text)
    || (/\b(?:halloween|boo bash)\b/.test(text) && /\b(?:candy|candies)\b/.test(text));
}

export function filterEvents(events, { query = '', city = 'all', category = 'all', halloweenOnly = false } = {}) {
  const search = query.trim().toLowerCase();
  return events.filter(event => (city === 'all' || event.city === city)
    && (category === 'all' || event.category === category)
    && (!halloweenOnly || isHalloweenCandyEvent(event))
    && (!search || [event.title, event.description, event.location, event.city, event.category]
      .filter(Boolean).join(' ').toLowerCase().includes(search)));
}

function hasNotEnded(event, current) {
  if (event.date !== current.date) return event.date > current.date;
  // The catalog has single-date occurrences, not RRULEs or multi-day spans.
  // Unknown ends and untimed date placeholders stay visible for their Pacific
  // date; do not invent an end time or mislabel a placeholder as all-day.
  return event.endTime == null || event.endTime > current.time;
}

export function selectVisibleEvents(events, { now = new Date(), month = null, selectedDate = null, sort = 'asc' } = {}) {
  const current = pacificDateTime(now);
  return events.filter(event => selectedDate ? event.date === selectedDate
    : month ? event.date.startsWith(month) : hasNotEnded(event, current))
    .sort((a, b) => {
      const chronological = a.date.localeCompare(b.date)
        || (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')
        || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
      return sort === 'title' ? a.title.localeCompare(b.title) || chronological
        : chronological * (sort === 'desc' ? -1 : 1);
    });
}

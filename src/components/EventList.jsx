import { useId } from 'react';
import Icon from './Icon.jsx';
import { SelectField } from './Filters.jsx';
import { eventTime, formatDate, monthLabel } from '../dates.js';
function categoryClass(category) {
  const value = category.toLowerCase();
  if (/market|food/.test(value)) return 'category-green';
  if (/art|music|theatre|theater/.test(value)) return 'category-purple';
  if (/festival|celebrat/.test(value)) return 'category-peach';
  return 'category-blue';
}
function EventRow({ event, onSelect }) {
  const rowId = useId();
  return <li><button className="event-row" onClick={() => onSelect(event)} aria-labelledby={`${rowId}-title ${rowId}-date`} aria-describedby={`${rowId}-time ${rowId}-place ${rowId}-category`}><span id={`${rowId}-date`} hidden>{formatDate(event.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span><span className="event-date" aria-hidden="true"><span>{formatDate(event.date, { month: 'short' })}</span><strong>{event.date.slice(-2)}</strong></span><span className="event-copy"><h3 id={`${rowId}-title`}>{event.title}</h3><span className="event-meta"><span id={`${rowId}-time`}>{eventTime(event)}</span><span aria-hidden="true"> · </span><span id={`${rowId}-place`}>{event.location || event.city}{event.location && !event.location.toLowerCase().includes(event.city.toLowerCase()) ? `, ${event.city}` : ''}</span></span></span><span id={`${rowId}-category`} className={`category-chip ${categoryClass(event.category)}`}>{event.category}</span><Icon name="right" size={21} /></button></li>;
}
export default function EventList({ events, month, selectedDate, clearDate, sort, setSort, onSelect, status, onRetry, onReset }) {
  const range = selectedDate ? formatDate(selectedDate, { month: 'long', day: 'numeric', year: 'numeric' }) : monthLabel(month);
  return <section className="events-panel" aria-labelledby="event-list-heading"><div className="list-toolbar"><div><h2 id="event-list-heading" aria-live="polite">{status === 'loading' ? 'Finding local events…' : `${events.length} ${events.length === 1 ? 'event' : 'events'} ${selectedDate ? 'on' : 'in'} ${range}`}</h2>{selectedDate ? <button className="text-button clear-date" onClick={clearDate}>Show the whole month</button> : null}</div><SelectField id="sort" className="sort-field" label="Sort by" value={sort} onChange={e => setSort(e.target.value)}><option value="asc">Date (soonest first)</option><option value="desc">Date (latest first)</option><option value="title">Event name (A–Z)</option></SelectField></div>{status === 'error' ? <div className="empty-state" role="alert"><h3>We couldn’t load the events.</h3><p>Please try again in a moment.</p><button className="button" onClick={onRetry}>Try again</button></div> : status === 'loading' ? <div className="empty-state" aria-live="polite"><div className="loading-line" /><div className="loading-line short" /><p>Loading the community calendar.</p></div> : events.length ? <ul className="events-list">{events.map(event => <EventRow key={event.id} event={event} onSelect={onSelect} />)}</ul> : <div className="empty-state"><h3>A little quiet here.</h3><p>No events match these filters. Try another month or broaden your search.</p><button className="button button-outline" onClick={onReset}>Clear filters</button></div>}</section>;
}

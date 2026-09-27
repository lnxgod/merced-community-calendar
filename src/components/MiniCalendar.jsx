import Icon from './Icon.jsx';
import { dateObject, formatDate, localToday, monthLabel, stepMonth } from '../dates.js';
export default function MiniCalendar({ month, setMonth, events, selectedDate, setSelectedDate }) {
  const first = dateObject(`${month}-01`);
  const dayOffset = first.getUTCDay();
  const dayCount = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const eventDates = new Set(events.map(event => event.date));
  const today = localToday();
  return <section className="mini-calendar" aria-label="Choose an event date"><div className="calendar-heading"><h2>{monthLabel(month)}</h2><div><button aria-label="Previous month" className="icon-button" onClick={() => setMonth(stepMonth(month, -1))}><Icon name="left" size={18} /></button><button aria-label="Next month" className="icon-button" onClick={() => setMonth(stepMonth(month, 1))}><Icon name="right" size={18} /></button></div></div><div className="calendar-grid">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span className="weekday" key={day}>{day}</span>)}{Array.from({ length: dayOffset }, (_, i) => <span key={`blank-${i}`} />)}{Array.from({ length: dayCount }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    const selected = date === selectedDate;
    const hasEvents = eventDates.has(date);
    return <button key={date} className={`calendar-day ${selected ? 'selected' : ''} ${date === today ? 'today' : ''} ${hasEvents ? 'has-events' : ''}`} aria-label={`${formatDate(date)}${hasEvents ? ', events available' : ', no matching events'}`} aria-pressed={selected} aria-current={date === today ? 'date' : undefined} onClick={() => setSelectedDate(selected ? null : date)}>{i + 1}</button>;
  })}</div></section>;
}

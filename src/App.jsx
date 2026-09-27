import { useEffect, useMemo, useState } from 'react';
import { Header, Hero, Footer, SubscribeBand } from './components/Layout.jsx';
import Filters from './components/Filters.jsx';
import Icon from './components/Icon.jsx';
import EventList from './components/EventList.jsx';
import MiniCalendar from './components/MiniCalendar.jsx';
import { AboutDialog, EventDialog, SubscribeDialog } from './components/Dialogs.jsx';
import { localToday, stepMonth } from './dates.js';

const DEFAULT_CONFIG = { published: false, icsUrl: 'https://community.gamechangersai.org/community.ics' };
async function readJson(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error(`Unable to load ${url}`);
  return response.json();
}
function validEvent(event) {
  return event && typeof event.id === 'string' && typeof event.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && ['Merced', 'Atwater', 'McSwain'].includes(event.city) && typeof event.category === 'string';
}
export default function App() {
  const [data, setData] = useState({ events: [], updatedAt: null });
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [status, setStatus] = useState('loading');
  const [configStatus, setConfigStatus] = useState('loading');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('all');
  const [category, setCategory] = useState('all');
  const [month, setMonthValue] = useState(() => localToday().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(null);
  const [sort, setSort] = useState('asc');
  const [dialog, setDialog] = useState(null);
  useEffect(() => {
    const abort = new AbortController();
    setStatus('loading');
    Promise.allSettled([readJson(`${import.meta.env.BASE_URL}events.json`, abort.signal), readJson(`${import.meta.env.BASE_URL}calendar-config.json`, abort.signal)]).then(([eventsResult, configResult]) => {
      if (abort.signal.aborted) return;
      if (eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value.events)) {
        const payload = eventsResult.value;
        const events = payload.events.filter(validEvent);
        setData({ events, updatedAt: payload.updatedAt });
        const firstUpcoming = events.filter(event => event.date >= localToday()).sort((a, b) => a.date.localeCompare(b.date))[0];
        setMonthValue(firstUpcoming ? firstUpcoming.date.slice(0, 7) : localToday().slice(0, 7));
        setStatus('ready');
      } else setStatus('error');
      if (configResult.status === 'fulfilled' && typeof configResult.value === 'object' && configResult.value !== null) {
        setConfig({ ...DEFAULT_CONFIG, ...configResult.value });
        setConfigStatus('ready');
      } else setConfigStatus('error');
    });
    return () => abort.abort();
  }, [retry]);
  const categories = useMemo(() => [...new Set(data.events.map(event => event.category))].sort(), [data.events]);
  const months = useMemo(() => {
    const values = new Set([month, ...data.events.map(event => event.date.slice(0, 7))]);
    for (let index = 0; index < 12; index++) values.add(stepMonth(localToday().slice(0, 7), index));
    return [...values].sort();
  }, [data.events, month]);
  const matchingEvents = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.events.filter(event => (city === 'all' || event.city === city) && (category === 'all' || event.category === category) && (!search || [event.title, event.description, event.location, event.city, event.category].filter(Boolean).join(' ').toLowerCase().includes(search)));
  }, [data.events, city, category, query]);
  const visibleEvents = useMemo(() => matchingEvents.filter(event => event.date.startsWith(month) && (!selectedDate || event.date === selectedDate)).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : (a.date.localeCompare(b.date) || (a.startTime || '99:99').localeCompare(b.startTime || '99:99') || a.title.localeCompare(b.title)) * (sort === 'desc' ? -1 : 1)), [matchingEvents, month, selectedDate, sort]);
  function setMonth(value) { setMonthValue(value); setSelectedDate(null); }
  function resetFilters() { setQuery(''); setCity('all'); setCategory('all'); setSelectedDate(null); }
  const onAbout = () => setDialog({ type: 'about' });
  const onSubscribe = () => setDialog({ type: 'subscribe' });
  const onClose = () => setDialog(null);
  return <><a href="#events" className="skip-link">Skip to events</a><div className="site-shell"><Header onAbout={onAbout} onSubscribe={onSubscribe} /><main><Hero /><div className="calendar-content" id="events"><Filters query={query} setQuery={setQuery} city={city} setCity={setCity} category={category} setCategory={setCategory} month={month} setMonth={setMonth} months={months} categories={categories} /><div className="calendar-layout"><details className="mobile-date-picker"><summary><Icon name="calendar" size={18} />Choose a date<Icon name="down" size={16} /></summary><MiniCalendar month={month} setMonth={setMonth} events={matchingEvents} selectedDate={selectedDate} setSelectedDate={setSelectedDate} /></details><EventList events={visibleEvents} month={month} selectedDate={selectedDate} clearDate={() => setSelectedDate(null)} sort={sort} setSort={setSort} onSelect={event => setDialog({ type: 'event', event })} status={status} onRetry={() => setRetry(value => value + 1)} onReset={resetFilters} /><aside className="calendar-rail"><MiniCalendar month={month} setMonth={setMonth} events={matchingEvents} selectedDate={selectedDate} setSelectedDate={setSelectedDate} /><SubscribeBand onSubscribe={onSubscribe} /></aside></div></div></main><Footer onAbout={onAbout} onSubscribe={onSubscribe} /></div>{dialog?.type === 'event' ? <EventDialog event={dialog.event} onClose={onClose} /> : dialog?.type === 'about' ? <AboutDialog onClose={onClose} updatedAt={data.updatedAt} count={data.events.length} /> : dialog?.type === 'subscribe' ? <SubscribeDialog onClose={onClose} config={config} configStatus={configStatus} /> : null}</>;
}

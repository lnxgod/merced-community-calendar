import { useEffect, useMemo, useState } from 'react';
import { Header, Hero, Footer, SubscribeBand } from './components/Layout.jsx';
import Filters from './components/Filters.jsx';
import Icon from './components/Icon.jsx';
import EventList from './components/EventList.jsx';
import MiniCalendar from './components/MiniCalendar.jsx';
import { AboutDialog, EventDialog, SubscribeDialog } from './components/Dialogs.jsx';
import { localToday, stepMonth } from './dates.js';
import { filterEvents, selectVisibleEvents } from './events.js';

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
  const [halloweenOnly, setHalloweenOnly] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [browsingMonth, setBrowsingMonth] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sort, setSort] = useState('asc');
  const [dialog, setDialog] = useState(null);
  const today = localToday(now);
  const month = browsingMonth ?? today.slice(0, 7);
  const upcoming = browsingMonth === null;
  useEffect(() => {
    let timer;
    const refresh = () => {
      const current = new Date();
      setNow(current);
      clearTimeout(timer);
      timer = setTimeout(refresh, 60_000 - current.getTime() % 60_000);
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setStatus('loading');
    Promise.allSettled([readJson(`${import.meta.env.BASE_URL}events.json`, abort.signal), readJson(`${import.meta.env.BASE_URL}calendar-config.json`, abort.signal)]).then(([eventsResult, configResult]) => {
      if (abort.signal.aborted) return;
      if (eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value.events)) {
        const payload = eventsResult.value;
        const events = payload.events.filter(validEvent);
        setData({ events, updatedAt: payload.updatedAt });
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
    for (let index = 0; index < 12; index++) values.add(stepMonth(today.slice(0, 7), index));
    return [...values].sort();
  }, [data.events, month, today]);
  const matchingEvents = useMemo(() => filterEvents(data.events, { city, category, query, halloweenOnly }), [data.events, city, category, query, halloweenOnly]);
  const visibleEvents = useMemo(() => selectVisibleEvents(matchingEvents, { now, month: browsingMonth, selectedDate, sort }), [matchingEvents, now, browsingMonth, selectedDate, sort]);
  function showUpcoming() { setBrowsingMonth(null); setSelectedDate(null); setSort('asc'); }
  function setMonth(value) {
    if (value === 'upcoming') showUpcoming();
    else { setBrowsingMonth(value); setSelectedDate(null); }
  }
  function selectDate(value) { setBrowsingMonth(month); setSelectedDate(value); }
  function resetFilters() { setQuery(''); setCity('all'); setCategory('all'); setHalloweenOnly(false); showUpcoming(); }
  const onAbout = () => setDialog({ type: 'about' });
  const onSubscribe = () => setDialog({ type: 'subscribe' });
  const onClose = () => setDialog(null);
  return <><a href="#events" className="skip-link">Skip to events</a><div className="site-shell"><Header onAbout={onAbout} onSubscribe={onSubscribe} /><main><Hero /><div className="calendar-content" id="events"><Filters query={query} setQuery={setQuery} city={city} setCity={setCity} category={category} setCategory={setCategory} month={upcoming ? 'upcoming' : month} setMonth={setMonth} months={months} categories={categories} halloweenOnly={halloweenOnly} setHalloweenOnly={setHalloweenOnly} /><div className="calendar-layout"><details className="mobile-date-picker"><summary><Icon name="calendar" size={18} />Choose a date<Icon name="down" size={16} /></summary><MiniCalendar month={month} setMonth={setMonth} events={matchingEvents} selectedDate={selectedDate} setSelectedDate={selectDate} today={today} /></details><EventList events={visibleEvents} month={month} upcoming={upcoming} showUpcoming={showUpcoming} selectedDate={selectedDate} clearDate={() => setSelectedDate(null)} sort={sort} setSort={setSort} onSelect={event => setDialog({ type: 'event', event })} status={status} onRetry={() => setRetry(value => value + 1)} onReset={resetFilters} /><aside className="calendar-rail"><MiniCalendar month={month} setMonth={setMonth} events={matchingEvents} selectedDate={selectedDate} setSelectedDate={selectDate} today={today} /><SubscribeBand onSubscribe={onSubscribe} /></aside></div></div></main><Footer onAbout={onAbout} onSubscribe={onSubscribe} /></div>{dialog?.type === 'event' ? <EventDialog event={dialog.event} onClose={onClose} /> : dialog?.type === 'about' ? <AboutDialog onClose={onClose} updatedAt={data.updatedAt} count={data.events.length} /> : dialog?.type === 'subscribe' ? <SubscribeDialog onClose={onClose} config={config} configStatus={configStatus} /> : null}</>;
}

import Icon from './Icon.jsx';
import { monthLabel } from '../dates.js';
export function SelectField({ id, label, value, onChange, children, className = '' }) {
  return <label className={`field ${className}`} htmlFor={id}><span>{label}</span><span className="select-wrap"><select id={id} aria-label={label} value={value} onChange={onChange}>{children}</select><Icon name="down" size={16} /></span></label>;
}
export default function Filters({ query, setQuery, city, setCity, category, setCategory, month, setMonth, months, categories }) {
  return <section className="filters" aria-label="Find community events"><label className="field search-field" htmlFor="event-search"><span>Search events</span><span className="search-wrap"><Icon name="search" /><input id="event-search" type="search" placeholder="Search by event name, keyword, or place…" value={query} onChange={e => setQuery(e.target.value)} /></span></label><SelectField id="community" label="Community" value={city} onChange={e => setCity(e.target.value)}><option value="all">All communities</option>{['Merced', 'Atwater', 'McSwain'].map(value => <option key={value}>{value}</option>)}</SelectField><SelectField id="category" label="Category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All events</option>{categories.map(value => <option key={value}>{value}</option>)}</SelectField><SelectField id="month" label="Month" value={month} onChange={e => setMonth(e.target.value)}>{months.map(value => <option key={value} value={value}>{monthLabel(value)}</option>)}</SelectField></section>;
}

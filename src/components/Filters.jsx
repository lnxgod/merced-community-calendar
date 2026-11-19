import Icon from './Icon.jsx';
import { monthLabel } from '../dates.js';
export function SelectField({ id, label, value, onChange, children, className = '' }) {
  return <label className={`field ${className}`} htmlFor={id}><span>{label}</span><span className="select-wrap"><select id={id} aria-label={label} value={value} onChange={onChange}>{children}</select><Icon name="down" size={16} /></span></label>;
}
export default function Filters({ query, setQuery, city, setCity, category, setCategory, month, setMonth, months, categories, halloweenOnly, setHalloweenOnly, toggleHalloween, toyDrive, toggleToyDrive, onReset }) {
  return <section className="filters" aria-label="Find community events">
    <div className="toy-drive-shortcuts" role="group" aria-label="Toy drives">
      <button type="button" className="toy-drive-button" aria-label="Toy drop-offs" aria-describedby="toy-dropoffs-description" aria-pressed={toyDrive === 'drop-offs'} onClick={() => toggleToyDrive('drop-offs')}>
        <Icon name="gift" size={25} /><span><strong>Toy drop-offs</strong><span id="toy-dropoffs-description">Find a local place to donate a toy</span></span>{toyDrive === 'drop-offs' && <Icon name="check" />}
      </button>
      <button type="button" className="toy-drive-button" aria-label="Toy-drive events" aria-describedby="toy-events-description" aria-pressed={toyDrive === 'events'} onClick={() => toggleToyDrive('events')}>
        <Icon name="calendar" size={25} /><span><strong>Toy-drive events</strong><span id="toy-events-description">Shows, fundraisers, and toy giveaways</span></span>{toyDrive === 'events' && <Icon name="check" />}
      </button>
    </div>
    <label className="field search-field" htmlFor="event-search"><span>{toyDrive === 'drop-offs' ? 'Search locations' : 'Search events'}</span><span className="search-wrap"><Icon name="search" /><input id="event-search" type="search" placeholder={toyDrive === 'drop-offs' ? 'Search drop-off locations…' : 'Search by event name, keyword, or place…'} value={query} onChange={e => setQuery(e.target.value)} /></span></label><SelectField id="community" label="Community" value={city} onChange={e => setCity(e.target.value)}><option value="all">All communities</option>{['Merced', 'Atwater', 'McSwain', 'Mariposa'].map(value => <option key={value}>{value}</option>)}</SelectField>{toyDrive !== 'drop-offs' && <><SelectField id="category" label="Category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All events</option>{categories.map(value => <option key={value}>{value}</option>)}</SelectField><SelectField id="month" label="When" value={month} onChange={e => setMonth(e.target.value)}><option value="upcoming">Upcoming events</option>{months.map(value => <option key={value} value={value}>{monthLabel(value)}</option>)}</SelectField></>}<div className="quick-filters"><button type="button" className="halloween-filter" aria-pressed={halloweenOnly} onClick={toggleHalloween}><Icon name="ghost" size={22} /><span>Trunk-or-treat &amp; Halloween candy</span></button>{halloweenOnly ? <button type="button" className="text-button" onClick={() => setHalloweenOnly(false)}>Clear Halloween filter</button> : null}{toyDrive !== 'all' && <button type="button" className="text-button" onClick={onReset}>Clear filters · show all listings</button>}</div></section>;
}

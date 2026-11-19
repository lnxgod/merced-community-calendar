import Icon from './Icon.jsx';
import { formatDate, safeUrl } from '../dates.js';
import { hasDropOffAddress } from '../drop-offs.js';

export default function DropOffLocations({ locations, status, onRetry, onReset }) {
  return <section className="drop-off-directory" aria-labelledby="drop-off-heading">
    <div className="directory-heading"><h2 id="drop-off-heading">Toy drop-off locations</h2><p role="status">{locations.length} {locations.length === 1 ? 'location' : 'locations'}</p></div>
    <p className="collection-note">Find a place to donate. Check each host’s collection hours and guidelines before visiting.</p>
    {status === 'loading' ? <p className="empty-state">Loading collection locations…</p>
      : status === 'error' ? <div className="empty-state" role="alert"><h3>We couldn’t load the locations.</h3><button className="button" onClick={onRetry}>Try again</button></div>
      : !locations.length ? <div className="empty-state"><h3>No drop-off locations in this view yet.</h3><p>Confirmed locations will appear here as they’re added. Try another community or search.</p><button className="button button-outline" onClick={onReset}>Clear filters</button></div>
      : <ul className="drop-off-list">{locations.map(location => {
        const source = safeUrl(location.sourceUrl);
        const mapUrl = hasDropOffAddress(location)
          ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.location)}`
          : null;
        return <li className="drop-off-location" key={location.id}>
          <p className="drop-off-status">{location.status === 'coming-soon' ? 'Coming Soon' : 'Collecting toys'}</p>
          <h3>{location.title}</h3>
          <dl>
            <div><dt>Address</dt><dd>{mapUrl ? (
              <a className="drop-off-map-link" href={mapUrl} target="_blank" rel="noopener noreferrer">
                <span>{location.location}</span>
                <span className="drop-off-map-label">Open in Google Maps <Icon name="external" size={15} /></span>
              </a>
            ) : location.location}</dd></div>
            {location.city && <div><dt>Community</dt><dd>{location.city}</dd></div>}
            {(location.startDate || location.endDate) && <div><dt>Collection dates</dt><dd>{location.startDate && formatDate(location.startDate)}{location.endDate && `${location.startDate ? ' – ' : 'Through '}${formatDate(location.endDate)}`}</dd></div>}
            {location.timeNote && <div><dt>Collection hours</dt><dd>{location.timeNote}</dd></div>}
          </dl>
          {location.description && <p>{location.description}</p>}
          {source && <div className="drop-off-actions">
            <a className="text-button" target="_blank" rel="noopener noreferrer" href={source}>Organizer details<Icon name="external" size={17} /></a>
          </div>}
        </li>;
      })}</ul>}
  </section>;
}

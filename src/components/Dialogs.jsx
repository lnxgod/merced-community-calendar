import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { eventTime, formatDate, safeUrl } from '../dates.js';
export function Dialog({ title, onClose, children, className = '' }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; dialog.close(); previousFocus?.focus(); };
  }, []);
  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    const focusable = [...dialogRef.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(element => element.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <dialog onKeyDown={trapFocus} ref={dialogRef} className={`dialog ${className}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}><div className="dialog-heading"><h2 id={titleId}>{title}</h2><button className="icon-button close-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button></div>{children}</dialog>;
}
export function EventDialog({ event, onClose }) {
  const source = safeUrl(event.sourceUrl);
  return <Dialog title={event.title} onClose={onClose}><dl className="event-facts"><div><dt>When</dt><dd>{formatDate(event.date)}<br />{eventTime(event)}{event.startTime ? ' Pacific time' : ''}{event.timeNote ? <small>{event.timeNote}</small> : null}{event.startTime && !event.endTime ? <small>End time not published.</small> : null}</dd></div><div><dt>Where</dt><dd>{event.location || event.city}{event.location && !event.location.toLowerCase().includes(event.city.toLowerCase()) ? <><br />{event.city}</> : null}</dd></div><div><dt>Category</dt><dd>{event.category}</dd></div>{event.cost ? <div><dt>Cost</dt><dd>{event.cost}</dd></div> : null}</dl>{event.description ? <p className="event-description">{event.description}</p> : null}<p className="source-note">Schedules can change. Please confirm details with the organizer before heading out.</p>{source ? <a className="button" href={source} target="_blank" rel="noopener noreferrer">Visit {event.sourceName || 'event source'}<Icon name="external" size={18} /></a> : <p className="source-note">The organizer’s link is unavailable.</p>}</Dialog>;
}
export function AboutDialog({ onClose, updatedAt, count }) {
  return <Dialog title="A little more connected." onClose={onClose}><div className="prose"><p>Around Town brings public community events in Merced, Atwater and McSwain into one easy-to-follow calendar.</p><p>This is an independent, volunteer-curated community project. Listings come from public organizer websites and community calendars, with a link to the original source on every event.</p><p>We’re building a useful starting point, and this won’t be every event in town. Dates, times, venues and admission can change. Always check with the organizer for the latest details.</p><p>Your personal and family calendars stay separate. Subscribing simply adds this public community calendar to your own calendar app.</p>{updatedAt ? <p className="source-note">{count} public {count === 1 ? 'listing' : 'listings'} · Last updated {formatDate(updatedAt.slice(0, 10), { month: 'long', day: 'numeric', year: 'numeric' })}</p> : null}</div></Dialog>;
}
export function SubscribeDialog({ onClose, config, configStatus }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const inputRef = useRef(null);
  const icsUrl = safeUrl(config.icsUrl);
  const googleUrl = safeUrl(config.googleSubscribeUrl) || (config.googleCalendarId ? `https://calendar.google.com/calendar/u/0?cid=${encodeURIComponent(config.googleCalendarId)}` : null);
  const live = Boolean(config.published && icsUrl);
  async function copyLink() {
    setCopyError(false);
    try { await navigator.clipboard.writeText(icsUrl); setCopied(true); }
    catch { inputRef.current?.focus(); inputRef.current?.select(); setCopyError(true); }
  }
  return <Dialog title="Take your town with you." onClose={onClose} className="subscribe-dialog"><p className="dialog-intro">Get community events in the calendar you already use. Subscribe once, and new listings appear as your app refreshes.</p>{!live ? <p className="draft-note" role="status">{configStatus === 'error' ? 'Calendar subscription details could not be loaded. Please close this window and try again later.' : 'The public calendar is being prepared. Subscription links will be available here when it is published.'}</p> : null}<div className="subscribe-options"><div><strong>Google Calendar</strong><p>Add Around Town alongside your existing calendars.</p>{live && config.googlePublished !== false && googleUrl ? <a className="button button-outline" href={googleUrl} target="_blank" rel="noopener noreferrer">Add to Google Calendar<Icon name="external" size={17} /></a> : <button className="button button-outline" disabled>{live ? 'Google Calendar coming soon' : 'Available when published'}</button>}</div><div><strong>Apple Calendar</strong><p>Open the subscription in Calendar on your Mac, iPhone or iPad.</p>{live ? <a className="button button-outline" href={icsUrl.replace(/^https?:/, 'webcal:')}>Subscribe in Apple Calendar<Icon name="calendar" size={18} /></a> : <button className="button button-outline" disabled>Available when published</button>}</div><div><strong>Outlook &amp; other calendar apps</strong><p>Copy the calendar address below. In Outlook, choose <b>Add calendar → Subscribe from web</b>, then paste the address.</p></div></div><label className="field" htmlFor="calendar-address"><span>Calendar subscription address</span><span className="copy-field"><input ref={inputRef} id="calendar-address" value={icsUrl || ''} readOnly aria-describedby="copy-status" /><button className="button" disabled={!live} onClick={copyLink}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copied' : 'Copy'}</button></span></label><p id="copy-status" className="source-note" aria-live="polite">{copyError ? 'The address is selected. Use your device’s copy command to copy it.' : copied ? 'Calendar address copied. Paste it into your calendar app’s subscription field.' : 'Choose a subscription to receive updates. Importing a downloaded file is only a one-time copy.'}</p></Dialog>;
}

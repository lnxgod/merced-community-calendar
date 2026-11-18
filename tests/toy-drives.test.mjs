import test from 'node:test';
import assert from 'node:assert/strict';
import { toyDriveType } from '../src/toy-drives.js';
import { filterEvents, selectVisibleEvents, eventOccursOnDate, eventOverlapsMonth, eventMonths } from '../src/events.js';
import { eventTime, eventEndDate } from '../src/dates.js';

// Fictional records exercise behavior; they are never published as locations.
const sample = {
  id: 'fixture-event', title: 'Community gathering', date: '2026-11-21',
  startTime: '10:00', endTime: '15:00', city: 'Merced',
  location: 'Test-only venue, Merced, CA', category: 'Community',
  description: 'Public organizer details. Children must be accompanied by an adult.',
  sourceName: 'Fixture organizer', sourceUrl: 'https://example.org/fixture',
};
const dropOff = {
  ...sample, id: 'fixture-drop-off', title: 'Christmas Star collection site',
  date: '2026-11-01', endDate: '2026-12-05', allDay: true,
  startTime: null, endTime: null, toyDriveType: 'drop-off',
  description: 'Donate new, unwrapped toys. Confirm host hours before visiting.',
  timeNote: 'Collection hours vary; check with the host.',
};

test('toy-drive classification includes charitable shows, fundraisers and distributions', () => {
  for (const title of ['Holiday toy drive', 'Car Show & Toy Drive', 'Turkey Trot benefiting Toys for Tots', 'Christmas Star toy fundraiser', 'Fire & Police Toy Distribution']) {
    assert.equal(toyDriveType({ ...sample, title }), 'event', title);
  }
  assert.equal(toyDriveType({ ...sample, title: 'Tree lighting', description: 'The organizer is holding a toy drive for local children.' }), 'event');
  assert.equal(toyDriveType({ ...sample, title: 'Firefighters dinner', description: 'Proceeds support the annual toy drive.' }), 'event');
});

test('drop-off sites stay separate from one-day shows that also collect donations', () => {
  for (const title of ['Merced PD toy drop-off location', 'Christmas Star toy drop‑off site', 'Toy collection bin', 'Toy donation drop off location']) {
    assert.equal(toyDriveType({ ...sample, title }), 'drop-off', title);
  }
  assert.equal(toyDriveType({ ...sample, title: 'Toy Drive Car Show & Drop-off' }), 'event');
  assert.equal(toyDriveType({ ...sample, title: 'Holiday toy drive show', description: 'Drop off a new, unwrapped toy at the show.' }), 'event');
  assert.equal(toyDriveType({ ...sample, title: 'Community center', toyDriveType: 'drop-off' }), 'drop-off');
  assert.equal(toyDriveType({ ...dropOff, toyDriveType: 'event' }), 'event');
});

test('ordinary toy activities and holiday entertainment do not match charity filters', () => {
  for (const title of ['Toy-Anime-Comic Con', 'Build a toy dump truck', 'Christmas concert', 'Merced PD open house', 'Holiday craft market']) {
    assert.equal(toyDriveType({ ...sample, title }), null, title);
  }
  assert.equal(toyDriveType({ ...sample, title: 'Kids toy workshop', description: 'Bring a toy to repair with a volunteer.' }), null);
  assert.equal(toyDriveType({ ...sample, title: 'Toy store sale', description: 'Buy toys and collect prizes.' }), null);
});

test('toy event filters intersect community, category and search while excluding legacy drop-off records', () => {
  const selected = Object.freeze({ ...sample, title: 'Neighborhood toy drive', location: 'Test-only downtown venue, Merced, CA' });
  const rows = Object.freeze([
    selected,
    Object.freeze({ ...selected, id: 'other-city', city: 'Atwater' }),
    Object.freeze({ ...selected, id: 'other-category', category: 'Markets' }),
    Object.freeze({ ...selected, id: 'other-search', location: 'Test-only north venue, Merced, CA' }),
    Object.freeze(dropOff),
    Object.freeze({ ...sample, id: 'ordinary' }),
  ]);
  const before = JSON.stringify(rows);
  assert.deepEqual(filterEvents(rows, { toyDrive: 'events', city: 'Merced', category: 'Community', query: 'downtown' }), [selected]);
  assert.deepEqual(filterEvents(rows, { toyDrive: 'events' }).map(e => e.id), ['fixture-event', 'other-city', 'other-category', 'other-search']);
  assert.deepEqual(filterEvents(rows, { toyDrive: 'drop-offs' }), []);
  assert.equal(filterEvents(rows).length, rows.length - 1);
  assert.equal(JSON.stringify(rows), before);
});

test('toy mode suppresses a stale candy filter while clearing toy mode restores candy selection', () => {
  const candy = { ...sample, id: 'candy', title: 'Trunk or Treat', date: '2026-10-31' };
  const toyEvent = { ...sample, id: 'toy', title: 'Toy drive fundraiser' };
  const rows = [candy, dropOff, toyEvent];
  assert.deepEqual(filterEvents(rows, { toyDrive: 'drop-offs', halloweenOnly: true }), []);
  assert.deepEqual(filterEvents(rows, { toyDrive: 'events', halloweenOnly: true }), [toyEvent]);
  assert.deepEqual(filterEvents(rows, { toyDrive: 'all', halloweenOnly: true }), [candy]);
});

test('ongoing collection spans remain visible through their inclusive final Pacific day', () => {
  for (const now of ['2026-11-17T20:00:00Z', '2026-12-06T07:59:59Z']) {
    assert.deepEqual(selectVisibleEvents([dropOff], { now: new Date(now) }), [dropOff]);
  }
  assert.deepEqual(selectVisibleEvents([dropOff], { now: new Date('2026-12-06T08:00:00Z') }), []);
  assert.equal(eventTime(dropOff), 'Collection dates · check host hours');
  assert.equal(eventEndDate(dropOff), '2026-12-05');
  assert.equal(dropOff.startTime, null);
  assert.equal(dropOff.endTime, null);
});

test('collection spans intersect covered calendar dates and months including month boundaries', () => {
  assert.deepEqual(eventMonths(dropOff), ['2026-11', '2026-12']);
  for (const date of ['2026-11-01', '2026-11-17', '2026-12-05']) {
    assert.equal(eventOccursOnDate(dropOff, date), true);
    assert.deepEqual(selectVisibleEvents([dropOff], { selectedDate: date }), [dropOff]);
  }
  for (const date of ['2026-10-31', '2026-12-06']) {
    assert.equal(eventOccursOnDate(dropOff, date), false);
    assert.deepEqual(selectVisibleEvents([dropOff], { selectedDate: date }), []);
  }
  assert.equal(eventOverlapsMonth(dropOff, '2026-12'), true);
  assert.deepEqual(selectVisibleEvents([dropOff], { month: '2026-12' }), [dropOff]);
  assert.deepEqual(selectVisibleEvents([dropOff], { month: '2027-01' }), []);
});

test('timed collection events keep their published times and expire at the known end', () => {
  const show = { ...sample, title: 'Toy drive show' };
  assert.equal(eventTime(show), '10 AM–3 PM');
  assert.deepEqual(selectVisibleEvents(filterEvents([show, dropOff], { toyDrive: 'events' }), {
    now: new Date('2026-11-21T22:59:59Z'),
  }), [show]);
  assert.deepEqual(selectVisibleEvents(filterEvents([show, dropOff], { toyDrive: 'events' }), {
    now: new Date('2026-11-21T23:00:00Z'),
  }), []);
});

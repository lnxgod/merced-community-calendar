import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { eventTime, localToday, pacificDateTime, stepMonth } from '../src/dates.js';
import { filterEvents, isHalloweenCandyEvent, selectVisibleEvents } from '../src/events.js';

const event = (id, overrides = {}) => ({
  id, title: id, date: '2026-10-05', startTime: '10:00', endTime: '12:00',
  city: 'Merced', category: 'Festivals & community', description: '', ...overrides,
});
const ids = events => events.map(row => row.id);
const at = value => new Date(value);

test('fresh default omits completed events and includes ongoing and later occurrences across months', () => {
  const records = [
    event('next-year', { date: '2027-01-01' }), event('past', { date: '2026-10-01' }),
    event('later', { startTime: '16:00', endTime: '18:00' }),
    event('ended', { endTime: '11:00' }), event('ongoing'),
    event('next-month', { date: '2026-11-01' }),
  ];
  const original = structuredClone(records);
  assert.deepEqual(ids(selectVisibleEvents(records, { now: at('2026-10-05T18:30:00Z') })),
    ['ongoing', 'later', 'next-month', 'next-year']);
  assert.deepEqual(records, original, 'Filtering and sorting must not rewrite history');
});

test('an ongoing event expires exactly at its published end, without rebuilding the catalog', () => {
  const records = [event('ongoing')];
  assert.deepEqual(ids(selectVisibleEvents(records, { now: at('2026-10-05T18:59:59Z') })), ['ongoing']);
  assert.deepEqual(selectVisibleEvents(records, { now: at('2026-10-05T19:00:00Z') }), []);
});

test('unknown ends and untimed date placeholders remain through their Pacific date only', () => {
  const records = [event('unknown-end', { endTime: null }), event('untimed', { startTime: null, endTime: null })];
  assert.deepEqual(ids(selectVisibleEvents(records, { now: at('2026-10-06T06:59:59Z') })), ['unknown-end', 'untimed']);
  assert.deepEqual(selectVisibleEvents(records, { now: at('2026-10-06T07:00:00Z') }), []);
  assert.equal(eventTime(records[1]), 'Time to be confirmed');
});

test('Pacific midnight, month/year rollover and leap day work independently of UTC date', () => {
  const records = [event('year-end', { date: '2026-12-31', startTime: '23:00', endTime: null }), event('new-year', { date: '2027-01-01' })];
  assert.equal(localToday(at('2027-01-01T07:59:59Z')), '2026-12-31');
  assert.deepEqual(ids(selectVisibleEvents(records, { now: at('2027-01-01T07:59:59Z') })), ['year-end', 'new-year']);
  assert.deepEqual(ids(selectVisibleEvents(records, { now: at('2027-01-01T08:00:00Z') })), ['new-year']);
  assert.deepEqual(pacificDateTime(at('2027-01-01T08:00:00Z')), { date: '2027-01-01', time: '00:00' });
  assert.equal(localToday(at('2028-03-01T07:59:59Z')), '2028-02-29');
  assert.equal(stepMonth('2026-12', 1), '2027-01');
  assert.equal(stepMonth('2027-01', -1), '2026-12');
});

test('DST changes use Pacific wall time and preserve ongoing events through both fall-back hours', () => {
  const fall = [event('fall', { date: '2026-11-01', startTime: '00:30', endTime: '03:00' })];
  for (const now of ['2026-11-01T08:30:00Z', '2026-11-01T09:30:00Z', '2026-11-01T10:59:59Z']) {
    assert.deepEqual(ids(selectVisibleEvents(fall, { now: at(now) })), ['fall']);
  }
  assert.deepEqual(selectVisibleEvents(fall, { now: at('2026-11-01T11:00:00Z') }), []);
  const spring = [event('spring', { date: '2026-03-08', startTime: '01:00', endTime: '03:00' })];
  assert.equal(selectVisibleEvents(spring, { now: at('2026-03-08T09:59:59Z') }).length, 1);
  assert.equal(selectVisibleEvents(spring, { now: at('2026-03-08T10:00:00Z') }).length, 0);
});

test('visitor and build-host timezone cannot change the Pacific cutoff', () => {
  const script = `import { localToday } from './src/dates.js'; console.log(localToday(new Date('2027-01-01T06:00:00Z')));`;
  for (const TZ of ['UTC', 'Asia/Tokyo', 'America/New_York']) {
    assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: new URL('../', import.meta.url), env: { ...process.env, TZ }, encoding: 'utf8',
    }).trim(), '2026-12-31');
  }
});

test('manual month/date browsing exposes history and keeps explicit sort choices', () => {
  const records = [event('z-today'), event('a-past', { date: '2026-10-01' }), event('future', { date: '2026-11-01' })];
  const now = at('2026-10-05T18:30:00Z');
  assert.deepEqual(ids(selectVisibleEvents(records, { now, month: '2026-10' })), ['a-past', 'z-today']);
  assert.deepEqual(ids(selectVisibleEvents(records, { now, month: '2026-10', selectedDate: '2026-10-01' })), ['a-past']);
  assert.deepEqual(ids(selectVisibleEvents(records, { now, month: '2026-10', sort: 'desc' })), ['z-today', 'a-past']);
  assert.deepEqual(ids(selectVisibleEvents(records, { now, month: '2026-10', sort: 'title' })), ['a-past', 'z-today']);
  assert.deepEqual(ids(selectVisibleEvents(records, { now })), ['z-today', 'future']);
});

test('explicit recurring occurrences roll forward without manufacturing additional dates', () => {
  const records = ['2026-10-01', '2026-10-08', '2026-10-15'].map(date => event(`weekly-${date}`, { date }));
  assert.deepEqual(ids(selectVisibleEvents(records, { now: at('2026-10-05T18:00:00Z') })), ['weekly-2026-10-08', 'weekly-2026-10-15']);
  assert.deepEqual(selectVisibleEvents(records, { now: at('2026-10-16T18:00:00Z') }), []);
});

test('ghost filter requires explicit trick/trunk-or-treat or Halloween candy content', () => {
  for (const title of ['Trunk or Treat', 'Trunk‑or‑Treat', 'Trick-or-treating', 'Halloween candy walk', 'Boo Bash with candies']) {
    assert.equal(isHalloweenCandyEvent(event('match', { title })), true, title);
  }
  assert.equal(isHalloweenCandyEvent(event('description', { title: 'Fall celebration', description: 'A 30-car trunk-or-treat loop.' })), true);
  for (const title of ['October market', 'Halloween concert', 'Fall harvest festival', 'Candy-making workshop', 'Boo Bash games and crafts']) {
    assert.equal(isHalloweenCandyEvent(event('no-match', { title })), false, title);
  }
});

const catalog = JSON.parse(readFileSync(new URL('../public/events.json', import.meta.url), 'utf8'));
test('the real catalog preserves all five verified trunk-or-treats and excludes unrelated Halloween parties', () => {
  const matches = new Set(ids(selectVisibleEvents(filterEvents(catalog.events, { halloweenOnly: true }), { now: at('2026-10-05T18:00:00Z') })));
  for (const id of [
    'merced-lao-family-trunk-or-treat-2026-10-16', 'trunk-or-treat-tarmac-2026-10-23',
    '6th-annual-cops-for-critters-car-show-2026-10-24', 'city-of-atwater-trunk-or-treat-2026-10-24',
    'yosemite-church-fall-family-fun-night-2026-10-31',
  ]) assert.ok(matches.has(id), id);
  assert.equal(matches.has('halloween-party-tarmac-2026-10-30'), false);
});

test('ghost toggle composes with search, community, category and explicit date filters, including empty results', () => {
  const records = [
    event('tarmac', { title: 'Trunk or Treat — The Tarmac', date: '2026-10-23', city: 'Atwater' }),
    event('atwater', { title: 'City of Atwater Trunk or Treat', date: '2026-10-24', city: 'Atwater' }),
    event('merced', { title: 'Merced Trunk-or-Treat', date: '2026-10-24' }),
    event('party', { title: 'Halloween Party', date: '2026-10-30', city: 'Atwater' }),
  ];
  const filters = { halloweenOnly: true, query: 'trunk', city: 'Atwater', category: 'Festivals & community' };
  const matched = filterEvents(records, filters);
  assert.deepEqual(ids(matched), ['tarmac', 'atwater']);
  assert.deepEqual(ids(selectVisibleEvents(matched, { selectedDate: '2026-10-24' })), ['atwater']);
  assert.deepEqual(selectVisibleEvents(matched, { selectedDate: '2026-10-25' }), []);
  assert.deepEqual(filterEvents(records, { ...filters, category: 'Sports' }), []);
  const partySearch = { query: 'Halloween Party', city: 'Atwater' };
  assert.equal(filterEvents(records, { ...partySearch, halloweenOnly: true }).length, 0);
  assert.deepEqual(ids(filterEvents(records, { ...partySearch, halloweenOnly: false })), ['party']);
});

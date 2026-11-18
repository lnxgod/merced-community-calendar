import test from 'node:test';
import assert from 'node:assert/strict';
import { hasDropOffAddress, selectDropOffLocations, validDropOffLocation } from '../src/drop-offs.js';

const placeholder = Object.freeze({
  id: 'fixture-holiday-show',
  title: 'Game Changers AI Holiday Show Toy Drop-Off Location',
  location: 'Coming Soon', status: 'coming-soon', city: null,
});
const now = new Date('2026-11-17T20:00:00Z');

test('an undated coming-soon directory listing does not need a calendar occurrence or map destination', () => {
  assert.equal(Boolean(validDropOffLocation(placeholder)), true);
  assert.deepEqual(selectDropOffLocations([placeholder], { now }), [placeholder]);
  assert.equal(hasDropOffAddress(placeholder), false);
  assert.equal(hasDropOffAddress({ ...placeholder, status: 'accepting' }), false);
  assert.equal(hasDropOffAddress({ ...placeholder, location: 'Test venue, Merced, CA' }), false);
  assert.equal(hasDropOffAddress({ ...placeholder, status: 'accepting', location: 'Test venue, Merced, CA' }), true);
});

test('directory search and community filtering preserve independent stable records', () => {
  const merced = Object.freeze({ ...placeholder, id: 'fixture-merced', title: 'Neighborhood toy donation site',
    status: 'accepting', city: 'Merced', location: 'Test-only downtown venue, Merced, CA' });
  const atwater = Object.freeze({ ...merced, id: 'fixture-atwater', city: 'Atwater', location: 'Test-only venue, Atwater, CA' });
  const records = Object.freeze([placeholder, merced, atwater]);
  const before = JSON.stringify(records);
  assert.deepEqual(selectDropOffLocations(records, { now, city: 'Merced', query: 'downtown' }), [merced]);
  assert.deepEqual(selectDropOffLocations(records, { now, city: 'Atwater', query: 'downtown' }), []);
  assert.deepEqual(selectDropOffLocations(records, { now, query: 'holiday show' }), [placeholder]);
  assert.equal(JSON.stringify(records), before);
});

test('closed sites and expired optional collection windows disappear independently of calendar dates', () => {
  const dated = { ...placeholder, id: 'fixture-dated', status: 'accepting',
    location: 'Test-only venue, Merced, CA', startDate: '2026-11-01', endDate: '2026-11-30' };
  const closed = { ...dated, id: 'fixture-closed', status: 'closed' };
  assert.deepEqual(selectDropOffLocations([dated, closed], { now }), [dated]);
  assert.deepEqual(selectDropOffLocations([dated], { now: new Date('2026-12-01T07:59:59Z') }), [dated]);
  assert.deepEqual(selectDropOffLocations([dated], { now: new Date('2026-12-01T08:00:00Z') }), []);
  assert.deepEqual(selectDropOffLocations([placeholder], { now: new Date('2027-01-01T20:00:00Z') }), [placeholder]);
});

test('incomplete directory rows do not render as usable donation locations', () => {
  const invalid = [null, {}, { ...placeholder, id: '' }, { ...placeholder, title: null },
    { ...placeholder, location: '' }, { ...placeholder, status: 'unknown' }];
  assert.deepEqual(selectDropOffLocations([...invalid, placeholder], { now }), [placeholder]);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { eventImage, withEventImages } from '../src/images.js';

const flyer = {
  src: 'assets/events/community-flyer-v1.jpg',
  alt: 'A public community event flyer with pumpkins and games.', width: 900, height: 1200,
};

test('local images resolve under the deployment base without rewriting stored metadata', () => {
  const original = structuredClone(flyer);
  assert.deepEqual(eventImage(flyer), { ...flyer, src: `./${flyer.src}`, thumbnailSrc: `./${flyer.src}` });
  assert.equal(eventImage(flyer, '/around-town/').src, `/around-town/${flyer.src}`);
  const thumbnailSrc = 'assets/events/community-thumb-v1.webp';
  assert.equal(eventImage({ ...flyer, thumbnailSrc }, '/').thumbnailSrc, `/${thumbnailSrc}`);
  assert.deepEqual(flyer, original);
});

test('untrusted or incomplete image metadata cannot create remote or executable image links', () => {
  for (const src of ['https://example.org/flyer.jpg', '//example.org/flyer.jpg', 'data:image/png;base64,abc',
    'javascript:alert(1)', '/assets/events/flyer.jpg', 'assets/events/../secret.jpg',
    'assets/events/%2e%2e/secret.jpg', 'assets/events/flyer.svg', 'assets/events/flyer.jpg?token=private',
    'assets/events/flyer.jpg#fragment', 'assets/events/flyer.jpg\n', 'assets\\events\\flyer.jpg']) {
    assert.equal(eventImage({ ...flyer, src }), null, src);
    assert.equal(eventImage({ ...flyer, thumbnailSrc: src }), null, src);
  }
  for (const value of [undefined, null, [], 'not an image', {}, { ...flyer, alt: '' },
    { ...flyer, alt: '   ' }, { ...flyer, alt: 'Private\nmessage' }, { ...flyer, alt: 'x'.repeat(501) },
    { ...flyer, width: 0 }, { ...flyer, height: 2.5 }, { ...flyer, width: true }, { ...flyer, width: 10001 }]) {
    assert.equal(eventImage(value), null);
  }
});

test('image associations preserve event data and IDs, including absent or unavailable manifests', () => {
  const events = [{ id: 'with-flyer', title: 'Community event' }, { id: 'text-only', title: 'Text event' }];
  const original = structuredClone(events);
  const illustrated = withEventImages(events, { images: { 'with-flyer': flyer, 'unrelated-id': flyer } });
  assert.equal(illustrated[0].image, flyer);
  assert.equal(illustrated[1].image, undefined);
  assert.deepEqual(events, original);
  assert.deepEqual(illustrated.map(({ image, ...event }) => event), events);
  for (const manifest of [undefined, null, {}, { images: [] }, { images: null }, { images: 'invalid' }]) {
    assert.ok(withEventImages(events, manifest).every(event => event.image === undefined));
  }
  assert.equal(withEventImages([{ id: 'inherited' }], { images: Object.create({ inherited: flyer }) })[0].image, undefined);
});

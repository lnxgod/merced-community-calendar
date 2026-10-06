const LOCAL_IMAGE = /^assets\/events\/[a-z0-9][a-z0-9_-]*\.(?:jpg|jpeg|png|webp)$/;

// Images are an optional website supplement, keyed by the catalog's stable IDs.
// Never pass arbitrary remote URLs or private attachment links to the browser.
export function eventImage(image, baseUrl = './') {
  if (!image || typeof image !== 'object' || Array.isArray(image)) return null;
  if (typeof image.src !== 'string' || !LOCAL_IMAGE.test(image.src)) return null;
  if (typeof image.alt !== 'string' || !image.alt.trim() || image.alt.length > 500) return null;
  if (/[\u0000-\u001f\u007f]/.test(image.alt)) return null;
  if (![image.width, image.height].every(value => Number.isInteger(value) && value > 0 && value <= 10000)) return null;
  if (image.thumbnailSrc !== undefined && (typeof image.thumbnailSrc !== 'string' || !LOCAL_IMAGE.test(image.thumbnailSrc))) return null;
  return {
    src: `${baseUrl}${image.src}`,
    thumbnailSrc: `${baseUrl}${image.thumbnailSrc ?? image.src}`,
    alt: image.alt.trim(), width: image.width, height: image.height,
  };
}

export function withEventImages(events, manifest) {
  const images = manifest?.images;
  return events.map(event => ({
    ...event,
    image: images && typeof images === 'object' && !Array.isArray(images) && Object.hasOwn(images, event.id)
      ? images[event.id] : undefined,
  }));
}

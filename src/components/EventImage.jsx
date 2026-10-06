import { useState } from 'react';
import { eventImage } from '../images.js';
import Icon from './Icon.jsx';

function ImageContent({ image, thumbnail, title }) {
  const [failed, setFailed] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  if (failed) return thumbnail ? null : <p className="source-note" role="status">The event image is unavailable. You can still use the event details and organizer link.</p>;
  const src = thumbnail && !useOriginal ? image.thumbnailSrc : image.src;
  function handleError() {
    if (thumbnail && src !== image.src) setUseOriginal(true);
    else setFailed(true);
  }
  const picture = <img className={thumbnail ? 'event-thumbnail' : 'event-full-image'} src={src}
    alt={thumbnail ? '' : image.alt} aria-hidden={thumbnail ? true : undefined}
    width={image.width} height={image.height} loading="lazy" decoding="async" onError={handleError} />;
  if (thumbnail) return picture;
  return <figure className="event-image">
    <a className="event-image-link" href={image.src} target="_blank" rel="noopener noreferrer"
      aria-label={`View full-size image for ${title} (opens in a new tab)`}>
      {picture}<span>View full-size image<Icon name="external" size={17} /></span>
    </a>
  </figure>;
}

export default function EventImage({ image: value, thumbnail = false, title }) {
  const image = eventImage(value, import.meta.env.BASE_URL);
  if (!image) return null;
  return <ImageContent key={`${image.src}|${image.thumbnailSrc}`} image={image} thumbnail={thumbnail} title={title} />;
}

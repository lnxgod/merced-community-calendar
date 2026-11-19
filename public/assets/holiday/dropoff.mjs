const details = document.getElementById('dropoff-details');
const requestLink = document.getElementById('song-picker-link');
const dropoffId = 'game-changers-ai-holiday-show-toy-drop-off';
const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function formatDate(date) {
  return date ? dateLabel.format(new Date(`${date}T00:00:00Z`)) : '';
}

async function findDropoff() {
  const response = await fetch('/events.json', { cache: 'no-cache', signal: AbortSignal.timeout(6000) });
  if (!response.ok) return;
  const feed = await response.json();
  return feed.dropOffLocations?.find((location) => location.id === dropoffId);
}

if (requestLink) document.getElementById('picker-status').textContent = 'Loading the playlist…';

if (details || requestLink) {
  let dropoff;
  try {
    dropoff = await findDropoff();
    if (dropoff && details) {
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Los_Angeles' }).format();
      if (dropoff.status === 'closed' || (dropoff.endDate && dropoff.endDate < today)) {
        details.textContent = 'Toy collection has ended.';
      } else {
        const location = dropoff.status === 'accepting' && dropoff.location && !/^coming soon$/i.test(dropoff.location.trim())
          ? dropoff.location : dropoff.city;
        const start = formatDate(dropoff.startDate);
        const end = formatDate(dropoff.endDate);
        const dates = start ? [start, end === start ? '' : end].filter(Boolean).join('–') : end && `Through ${end}`;
        const publicDetails = [location, dates, dropoff.timeNote].filter(Boolean);
        if (publicDetails.length) details.textContent = publicDetails.join(' · ');
      }
    }
  } catch {
    // Keep the page's calendar link and fallback text when the public feed is unavailable.
  }
  if (requestLink) {
    const match = /^https:\/\/community\.gamechangersai\.org\/roadtree\/#([A-Za-z0-9_-]{43})$/.exec(dropoff?.songRequestUrl ?? '');
    if (match) {
      requestLink.href = dropoff.songRequestUrl;
      requestLink.textContent = 'Open the song picker';
      try {
        const { showPicker } = await import('/roadtree/picker.mjs?v=2');
        await showPicker(match[1]);
      } catch {
        document.getElementById('picker-status').textContent = 'Couldn’t load the playlist. Try opening the song picker.';
      }
    } else {
      document.getElementById('picker-status').textContent = 'Song requests are unavailable right now.';
    }
  }
}

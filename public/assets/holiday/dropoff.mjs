const details = document.getElementById('dropoff-details');
const dropoffId = 'game-changers-ai-holiday-show-toy-drop-off';
const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function formatDate(date) {
  return date ? dateLabel.format(new Date(`${date}T00:00:00Z`)) : '';
}

async function findDropoff() {
  const response = await fetch('/events.json', { signal: AbortSignal.timeout(6000) });
  if (!response.ok) return;
  const feed = await response.json();
  return feed.dropOffLocations?.find((location) => location.id === dropoffId);
}

if (details) {
  try {
    const dropoff = await findDropoff();
    if (dropoff) {
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Los_Angeles' }).format();
      if (dropoff.status === 'closed' || (dropoff.endDate && dropoff.endDate < today)) {
        details.textContent = 'Toy collection has ended.';
      } else if (dropoff.status === 'accepting' && dropoff.location && !/^coming soon$/i.test(dropoff.location.trim())) {
        const start = formatDate(dropoff.startDate);
        const end = formatDate(dropoff.endDate);
        const dates = start ? [start, end === start ? '' : end].filter(Boolean).join('–') : end && `Through ${end}`;
        details.textContent = [dropoff.location, dates, dropoff.timeNote].filter(Boolean).join(' · ');
      }
    }
  } catch {
    // Keep the page's calendar link and fallback text when the public feed is unavailable.
  }
}

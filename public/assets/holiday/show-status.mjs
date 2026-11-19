const status = document.getElementById('live-show-status');
const nextSong = document.getElementById('next-song');
const lineup = document.getElementById('upcoming-songs');
const requests = document.getElementById('queued-songs');
const lineupNote = document.getElementById('lineup-note');
const unavailable = status.textContent;
const endpoint = new URL('/api/roadtree/status', document.querySelector('meta[name="roadtree-api-origin"]').content);
const freshnessMs = 90_000;
let activeRequest;
let expiryTimer;

function publicTitles(values) {
  return Array.isArray(values) ? values.filter(title => typeof title === 'string' && title.trim()).slice(0, 5) : [];
}

function renderList(list, titles) {
  list.parentElement.hidden = titles.length === 0;
  if (list.children.length === titles.length && titles.every((title, i) => list.children[i].textContent === title)) return;
  list.replaceChildren(...titles.map(title => {
    const item = document.createElement('li');
    item.textContent = title;
    return item;
  }));
}

function display(report) {
  const playing = report?.state === 'playing';
  const label = playing ? 'Now playing' : 'Paused';
  const message = report ? `${label} · ${report.currentTitle}` : unavailable;
  if (status.textContent !== message) status.textContent = message;
  status.toggleAttribute('data-playing', playing);
  const upcoming = publicTitles(report?.upcomingTitles ?? [report?.nextTitle]);
  if (lineup) {
    renderList(lineup, upcoming);
    renderList(requests, publicTitles(report?.queuedTitles));
    lineupNote.hidden = !report || upcoming.length > 0;
  } else if (nextSong) {
    nextSong.hidden = upcoming.length === 0;
    nextSong.textContent = upcoming.length ? `Up next · ${upcoming[0]}` : '';
  }
}

function showReport(report) {
  clearTimeout(expiryTimer);
  const age = Date.now() - Date.parse(report?.observedAt);
  if (!['playing', 'paused'].includes(report?.state) || !Number.isFinite(age) || age < -5000 || age >= freshnessMs ||
      typeof report.currentTitle !== 'string' || !report.currentTitle.trim()) {
    display(null);
    return;
  }
  display(report);
  expiryTimer = setTimeout(() => display(null), freshnessMs - age);
}

async function refresh() {
  if (document.hidden || activeRequest) return;
  const request = new AbortController();
  activeRequest = request;
  const timeout = setTimeout(() => request.abort(), 8000);
  try {
    const response = await fetch(endpoint, { cache: 'no-store', credentials: 'omit', signal: request.signal });
    const report = response.ok ? await response.json() : null;
    if (activeRequest === request) showReport(report);
  } catch {
    if (activeRequest === request) showReport(null);
  } finally {
    clearTimeout(timeout);
    if (activeRequest === request) activeRequest = null;
  }
}

function suspend() {
  activeRequest?.abort();
  activeRequest = null;
  showReport(null);
}

window.addEventListener('pagehide', suspend);
window.addEventListener('pageshow', refresh);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspend();
  else refresh();
});
setInterval(refresh, 20_000);
refresh();

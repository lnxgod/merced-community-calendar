const status = document.getElementById('live-show-status');
const nextSong = document.getElementById('next-song');
const unavailable = status.textContent;
const endpoint = new URL('/api/roadtree/status', document.querySelector('meta[name="roadtree-api-origin"]').content);
const freshnessMs = 90_000;
let activeRequest;
let expiryTimer;

function display(currentTitle, nextTitle) {
  const message = currentTitle ? `Now playing · ${currentTitle}` : unavailable;
  if (status.textContent !== message) status.textContent = message;
  status.toggleAttribute('data-playing', Boolean(currentTitle));
  if (!nextSong) return;
  const next = nextTitle ? `Up next · ${nextTitle}` : '';
  if (nextSong.textContent !== next) nextSong.textContent = next;
  nextSong.hidden = !next;
}

function showReport(report) {
  clearTimeout(expiryTimer);
  const age = Date.now() - Date.parse(report?.observedAt);
  if (report?.state !== 'playing' || !Number.isFinite(age) || age < -5000 || age >= freshnessMs ||
      typeof report.currentTitle !== 'string' || !report.currentTitle.trim()) {
    display(null, null);
    return;
  }
  display(report.currentTitle, report.nextTitle);
  expiryTimer = setTimeout(() => display(null, null), freshnessMs - age);
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

const status = document.getElementById('live-show-status');
const unavailable = status.textContent;
const endpoint = new URL('/api/roadtree/status', document.querySelector('meta[name="roadtree-api-origin"]').content);
const freshnessMs = 90_000;
let activeRequest;
let expiryTimer;

function display(message) {
  if (status.textContent !== message) status.textContent = message;
}

function showReport(report) {
  clearTimeout(expiryTimer);
  const age = Date.now() - Date.parse(report?.observedAt);
  if (report?.state !== 'playing' || !Number.isFinite(age) || age < -5000 || age >= freshnessMs ||
      typeof report.currentTitle !== 'string' || !report.currentTitle.trim()) {
    display(unavailable);
    return;
  }
  const next = report.nextTitle ? ` Up next is “${report.nextTitle}”.` : '';
  display(`Now playing “${report.currentTitle}”.${next}`);
  expiryTimer = setTimeout(() => display(unavailable), freshnessMs - age);
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

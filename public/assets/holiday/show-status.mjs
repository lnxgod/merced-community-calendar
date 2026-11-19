const status = document.getElementById('live-show-status');
const nextSong = document.getElementById('next-song');
const lineup = document.getElementById('upcoming-songs');
const requests = document.getElementById('queued-songs');
const rankingRule = document.getElementById('ranking-rule');
const lineupNote = document.getElementById('lineup-note');
const unavailable = status.textContent;
const endpoint = new URL('/api/roadtree/status', document.querySelector('meta[name="roadtree-api-origin"]').content);
const freshnessMs = 90_000;
let activeRequest;
let expiryTimer;
const lastList = new WeakMap();

function publicTitles(values) {
  return Array.isArray(values) ? values.filter(title => typeof title === 'string' && title.trim()).slice(0, 5) : [];
}

function voteRow({ title, votes, committed }) {
  const row = document.createElement('span');
  row.className = 'vote-row';
  const name = document.createElement('span');
  name.textContent = title;
  const count = document.createElement('span');
  count.className = 'vote-count';
  count.textContent = `${votes} ${votes === 1 ? 'vote' : 'votes'}`;
  row.append(name, count);
  if (committed) {
    const selected = document.createElement('small');
    selected.className = 'selected-song';
    selected.textContent = 'Selected to play';
    row.append(selected);
  }
  return row;
}

function renderList(list, entries) {
  const snapshot = JSON.stringify(entries);
  if (lastList.get(list) === snapshot) return;
  lastList.set(list, snapshot);
  list.parentElement.hidden = entries.length === 0;
  list.replaceChildren(...entries.map(entry => {
    const item = document.createElement('li');
    item.append(typeof entry === 'string' ? entry : voteRow(entry));
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
    const ranks = report?.rankedRequests;
    if (Array.isArray(ranks)) {
      const counted = ranks.filter(row => typeof row?.title === 'string' && row.title.trim() &&
        Number.isSafeInteger(row.votes) && row.votes >= 0).slice(0, 5);
      renderList(requests, counted);
      if (rankingRule) rankingRule.hidden = counted.length === 0;
    } else {
      renderList(requests, publicTitles(report?.queuedTitles));
      if (rankingRule) rankingRule.hidden = true;
    }
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

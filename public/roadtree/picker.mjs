const requestSection = document.getElementById('request');
const requestAccessHelp = document.getElementById('request-access-help');
const invitePattern = /^[A-Za-z0-9_-]{43}$/;
const entryPattern = /^[a-f0-9]{32}$/;
const appInvitePrefix = '#request=';
const holidayDropOffId = 'game-changers-ai-holiday-show-toy-drop-off';
const visitorPattern = /^[a-f0-9]{32}$/;
const visitorKey = 'around-town-roadtree-visitor';
const cooldownKey = 'around-town-roadtree-cooldown-v3';
const requestIntervalSeconds = 5 * 60;
const inviteKey = 'around-town-holiday-app-invite';
const title = document.getElementById('picker-title');
const form = document.getElementById('song-form');
const song = document.getElementById('song');
const submit = form?.querySelector('button');
const status = document.getElementById('picker-status');

function readLocal(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeLocal(key, value) {
  try { localStorage.setItem(key, value); } catch {
    // The current page keeps its visitor ID even if the browser blocks storage.
  }
}

function savedCooldown() {
  const current = Number(readLocal(cooldownKey)) || 0;
  // Older pickers recorded the same request with a six- or fifteen-minute deadline.
  const sixMinuteDeadline = Number(readLocal('around-town-roadtree-cooldown-v2')) || 0;
  const fifteenMinuteDeadline = Number(readLocal('around-town-roadtree-cooldown')) || 0;
  return Math.max(current, sixMinuteDeadline - (6 * 60 - requestIntervalSeconds) * 1000,
    fifteenMinuteDeadline - (15 * 60 - requestIntervalSeconds) * 1000);
}

function readInvite() {
  try { return sessionStorage.getItem(inviteKey) ?? ''; } catch { return ''; }
}

function saveInvite(invite) {
  try {
    if (invite) sessionStorage.setItem(inviteKey, invite);
    else sessionStorage.removeItem(inviteKey);
  } catch {
    // The current app link still works when the browser blocks storage.
  }
}

async function inviteFromDropOff(entry) {
  const response = await fetch('/events.json', {
    cache: 'no-cache', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout?.(6000),
  });
  if (!response.ok) throw new Error('Toy drop-off details are unavailable');
  const feed = await response.json();
  const source = feed.dropOffLocations?.find(location => location.id === holidayDropOffId)?.sourceUrl;
  if (!source) return '';
  const link = new URL(source);
  if (link.origin !== location.origin || link.pathname !== location.pathname ||
      link.searchParams.get('vote') !== entry || !link.hash.startsWith(appInvitePrefix)) return '';
  return link.hash.slice(appInvitePrefix.length);
}

function visitorId() {
  const saved = readLocal(visitorKey);
  if (saved && visitorPattern.test(saved)) return saved;
  const random = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');
  writeLocal(visitorKey, id);
  return id;
}

function configuredOrigin() {
  const value = document.querySelector('meta[name="roadtree-api-origin"]').content.trim();
  const url = new URL(value || location.origin);
  if (url.username || url.password || url.href !== `${url.origin}/`) throw new Error('Invalid API origin');
  if (url.protocol !== 'https:' && url.origin !== location.origin) throw new Error('Invalid API protocol');
  return url.origin;
}

async function post(origin, route, payload) {
  const response = await fetch(`${origin}/api/roadtree/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout?.(10000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data: data ?? {} };
}

function retrySeconds(response, data) {
  const seconds = Number(data.retryAfterSeconds || response.headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(3600, Math.ceil(seconds)) : 0;
}

async function showPicker(invite) {
  status.textContent = requestSection ? 'Loading songs for voting…' : 'Checking the event link…';
  let origin;
  let catalog;
  try {
    origin = configuredOrigin();
    catalog = await post(origin, 'catalog', { invite });
  } catch {
    status.textContent = 'Couldn’t load songs for voting. Refresh to try again.';
    return;
  }

  if (!catalog.response.ok || !Array.isArray(catalog.data.tracks)) {
    if ([401, 403, 404, 410].includes(catalog.response.status)) {
      if (requestSection) saveInvite(null);
      status.textContent = requestSection ? 'This link can’t open song voting.' : '';
    } else {
      status.textContent = 'Song requests are unavailable right now.';
    }
    return;
  }

  const tracks = catalog.data.tracks.filter((track) => typeof track?.id === 'string' && track.id
    && typeof track.title === 'string' && track.title);
  if (tracks.length === 0) {
    status.textContent = 'Song requests are unavailable right now.';
    return;
  }

  if (requestSection) {
    saveInvite(invite);
    requestAccessHelp.hidden = true;
  } else {
    title.textContent = 'Vote for the next song at the house';
    document.title = 'Vote for the next song at the house · Around Town';
  }
  song.append(...tracks.map((track) => new Option(track.title, track.id)));
  form.hidden = false;

  const id = visitorId();
  let busy = false;
  let blockedUntil = savedCooldown();
  let cooldown;

  function updateButton() {
    submit.disabled = busy || !song.value || blockedUntil > Date.now();
  }

  function waitForCooldown(seconds, message) {
    clearTimeout(cooldown);
    if (seconds > 0) {
      blockedUntil = Date.now() + seconds * 1000;
      writeLocal(cooldownKey, blockedUntil);
      const minutes = Math.ceil(seconds / 60);
      status.textContent = `${message} Wait about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} before voting again.`.trim();
      cooldown = setTimeout(() => {
        blockedUntil = 0;
        status.textContent = 'You can vote again once your previous request has cleared.';
        updateButton();
      }, seconds * 1000);
    } else {
      status.textContent = message;
    }
    updateButton();
  }

  waitForCooldown(Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000)), '');
  song.addEventListener('change', updateButton);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    busy = true;
    song.disabled = true;
    updateButton();
    status.textContent = 'Sending your vote…';

    try {
      const { response, data } = await post(origin, 'request', { invite, visitorId: id, songId: song.value });
      const seconds = retrySeconds(response, data);

      if (response.ok && data.ok === true) {
        song.value = '';
        waitForCooldown(seconds || requestIntervalSeconds, 'Your vote counted toward the next song at the house.');
      } else if ([401, 403, 404, 410].includes(response.status)) {
        form.hidden = true;
        if (requestSection) {
          saveInvite(null);
          requestAccessHelp.hidden = false;
          status.textContent = 'This link can’t open song voting.';
        } else {
          title.textContent = 'Page unavailable';
          document.title = 'Page unavailable · Around Town';
          status.textContent = '';
        }
      } else if (response.status === 409) {
        waitForCooldown(seconds, 'Your previous vote is still in line.');
      } else if (response.status === 429) {
        waitForCooldown(seconds, seconds ? '' : 'Song requests are busy. Try again in a moment.');
      } else {
        status.textContent = 'Couldn’t send your vote. Try again in a moment.';
      }
    } catch {
      status.textContent = 'Couldn’t send your vote. Try again in a moment.';
    } finally {
      busy = false;
      song.disabled = false;
      updateButton();
    }
  });
}

async function openPicker() {
  const prefix = requestSection ? appInvitePrefix : '#';
  window.addEventListener('hashchange', () => {
    // Internal section links keep working during a visit. A new invitation is checked afresh.
    if (!requestSection || !location.hash || location.hash.startsWith(prefix)) location.reload();
  });

  // A tap on the in-page shortcut can change the hash while this module loads.
  const initialHash = typeof originalHolidayVoteHash === 'string' ? originalHolidayVoteHash : location.hash;
  const incomingHash = location.hash.startsWith(prefix) ? location.hash : initialHash;
  const hasInvite = incomingHash.startsWith(prefix);
  const entry = requestSection ? new URLSearchParams(location.search).get('vote') : null;
  const fromApp = requestSection && (hasInvite || entry !== null);
  let invite = hasInvite ? incomingHash.slice(prefix.length) : '';

  if (fromApp) requestSection.scrollIntoView();
  if (!invitePattern.test(invite) && entryPattern.test(entry ?? '')) {
    status.textContent = 'Opening song voting…';
    try { invite = await inviteFromDropOff(entry); } catch {
      status.textContent = 'Couldn’t load songs for voting. Refresh to try again.';
      return;
    }
  }
  if (requestSection && !fromApp) invite = readInvite();
  if (invitePattern.test(invite)) {
    await showPicker(invite);
  } else if (fromApp) {
    status.textContent = 'This link can’t open song voting.';
  }
}

if (form) void openPicker();

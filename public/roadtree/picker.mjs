const requestSection = document.getElementById('request');
const requestShortcut = document.getElementById('request-shortcut');
const requestNotice = document.getElementById('request-notice');
const invitePattern = /^[A-Za-z0-9_-]{43}$/;
const visitorPattern = /^[a-f0-9]{32}$/;
const visitorKey = 'around-town-roadtree-visitor';
const cooldownKey = 'around-town-roadtree-cooldown';
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
  const notice = requestNotice ?? status;
  if (!requestSection) status.textContent = 'Checking the event link…';
  let origin;
  let catalog;
  try {
    origin = configuredOrigin();
    catalog = await post(origin, 'catalog', { invite });
  } catch {
    notice.textContent = 'Couldn’t load the playlist. Refresh to try again.';
    return;
  }

  if (!catalog.response.ok || !Array.isArray(catalog.data.tracks)) {
    notice.textContent = [401, 403, 404, 410].includes(catalog.response.status)
      ? ''
      : 'Song requests are unavailable right now.';
    return;
  }

  const tracks = catalog.data.tracks.filter((track) => typeof track?.id === 'string' && track.id
    && typeof track.title === 'string' && track.title);
  if (tracks.length === 0) {
    notice.textContent = 'Song requests are unavailable right now.';
    return;
  }

  if (requestSection) {
    requestSection.hidden = false;
    requestShortcut.hidden = false;
  } else {
    title.textContent = 'Request a song';
    document.title = 'Request a song · Around Town';
  }
  song.append(...tracks.map((track) => new Option(track.title, track.id)));
  form.hidden = false;

  const id = visitorId();
  let busy = false;
  let blockedUntil = Number(readLocal(cooldownKey)) || 0;
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
      status.textContent = `${message} You can request again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`.trim();
      cooldown = setTimeout(() => {
        blockedUntil = 0;
        status.textContent = 'You can request another song now.';
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
    status.textContent = 'Sending your request…';

    try {
      const { response, data } = await post(origin, 'request', { invite, visitorId: id, songId: song.value });
      const seconds = retrySeconds(response, data);

      if (response.ok && data.ok === true) {
        song.value = '';
        waitForCooldown(seconds || 900, 'Song added to the queue.');
      } else if ([401, 403, 404, 410].includes(response.status)) {
        form.hidden = true;
        if (requestSection) {
          requestSection.hidden = true;
          requestShortcut.hidden = true;
          requestNotice.textContent = 'Song requests have closed.';
        } else {
          title.textContent = 'Page unavailable';
          document.title = 'Page unavailable · Around Town';
          status.textContent = '';
        }
      } else if (response.status === 409) {
        waitForCooldown(seconds, 'You already have a song in the queue.');
      } else if (response.status === 429) {
        waitForCooldown(seconds, seconds ? '' : 'Song requests are busy. Try again in a moment.');
      } else {
        status.textContent = 'Couldn’t send your request. Try again in a moment.';
      }
    } catch {
      status.textContent = 'Couldn’t send your request. Try again in a moment.';
    } finally {
      busy = false;
      song.disabled = false;
      updateButton();
    }
  });
}

if (form) {
  const prefix = requestSection ? '#request=' : '#';
  const invite = location.hash.startsWith(prefix) ? location.hash.slice(prefix.length) : '';
  window.addEventListener('hashchange', () => {
    // Internal section links keep working during a visit. A new invitation is checked afresh.
    if (!requestSection || !location.hash || location.hash.startsWith(prefix)) location.reload();
  });
  if (invitePattern.test(invite)) await showPicker(invite);
}

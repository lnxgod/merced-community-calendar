// Keep this classification aligned with Around Town mobile. Publisher metadata
// is preferred; existing public event text remains usable without retagging it.
export function toyDriveType(event) {
  if (['drop-off', 'event'].includes(event.toyDriveType)) return event.toyDriveType;
  const title = (event.title ?? '').toLowerCase().replace(/[‐‑‒–—]/g, '-');
  const text = `${title} ${event.description ?? ''}`.toLowerCase().replace(/[‐‑‒–—]/g, '-');
  const toyDrive = /\btoy[\s-]+(?:drives?|drop[\s-]?offs?|donations?|collection|distribution)\b|\btoys? for tots\b|\b(?:donate|collecting|donating) (?:a |new |unwrapped |new,? unwrapped )*toys?\b|\bbring (?:a |an )?(?:new[ ,]+|unwrapped[ ,]+)+toys?\b/.test(text)
    || (/\bchristmas star\b/.test(text) && /\b(?:toys?|donations?|drop[\s-]?offs?|collection)\b/.test(text));
  if (!toyDrive) return null;
  const dropOff = /\bdrop[\s-]?offs?\b|\bcollection (?:sites?|locations?|bins?|boxes?|points?)\b|\bdonation (?:sites?|locations?|bins?|boxes?|points?)\b/.test(title);
  const activity = /\b(?:shows?|festivals?|concerts?|parades?|fundraisers?|dinners?|toy runs?)\b/.test(title);
  return dropOff && !activity ? 'drop-off' : 'event';
}

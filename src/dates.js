export const TIME_ZONE = 'America/Los_Angeles';
export function localToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
export function dateObject(value) { return new Date(`${value}T12:00:00Z`); }
export function formatDate(value, options = { dateStyle: 'full' }) { return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(dateObject(value)); }
export function monthLabel(month) { return formatDate(`${month}-01`, { month: 'long', year: 'numeric' }); }
export function stepMonth(month, offset) {
  const [year, number] = month.split('-').map(Number);
  const value = new Date(Date.UTC(year, number - 1 + offset, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}
export function timeLabel(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return `${hours % 12 || 12}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''} ${hours < 12 ? 'AM' : 'PM'}`;
}
export function eventTime(event) {
  if (!event.startTime) return 'Time to be confirmed';
  return `${timeLabel(event.startTime)}${event.endTime ? `–${timeLabel(event.endTime)}` : ''}`;
}
export function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

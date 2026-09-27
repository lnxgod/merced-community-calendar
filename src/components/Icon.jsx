export default function Icon({ name, size = 20, ...props }) {
  const shapes = {
    search: <><circle cx="10.5" cy="10.5" r="6.7" /><path d="m15.6 15.6 5 5" /></>,
    down: <path d="m6 9 6 6 6-6" />,
    right: <path d="m9 5 7 7-7 7" />,
    left: <path d="m15 5-7 7 7 7" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M7 3v5m10-5v5M3 10h18" /></>,
    external: <><path d="M14 3h7v7m0-7L10 14" /><path d="M10 4H4v16h16v-6" /></>,
    check: <path d="m4 12 5 5L20 6" />,
    copy: <><rect x="8" y="8" width="12" height="13" rx="1.5" /><path d="M15 8V3H3v13h5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{shapes[name]}</svg>;
}
export function SunMark() {
  return <svg className="sun-mark" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="28" cy="28" r="11" />{Array.from({length: 12}, (_, i) => <path key={i} d="M28 3v7" transform={`rotate(${i * 30} 28 28)`} />)}</svg>;
}

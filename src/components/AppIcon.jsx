const ICONS = {
  home: <><path d="M3 10.7 12 3l9 7.7"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-7h5v7"/></>,
  quote: <><path d="M6 2.8h8l4 4V21H6z"/><path d="M14 2.8V7h4"/><path d="M9 11h6M9 15h6"/></>,
  clients: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
  documents: <><path d="M4 4h6l2 3h8v13H4z"/><path d="M8 12h8M8 16h6"/></>,
  commissions: <><circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.7-.8-1.8-1.2-3-1.2-1.8 0-3 1-3 2.3 0 3.4 6 1.6 6 5 0 1.4-1.3 2.4-3.1 2.4-1.5 0-2.8-.5-3.7-1.5M12.7 5.5v2M12.7 17v2"/></>,
  tutorial: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v16H7.5A3.5 3.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M9 7h7M9 11h7"/></>,
  team: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2"/><circle cx="17.5" cy="9" r="2.5"/><path d="M15.5 14.5a4.5 4.5 0 0 1 5 4.5v1"/></>,
  learn: <><path d="m3 9 9-5 9 5-9 5z"/><path d="M7 12v4c3 2 7 2 10 0v-4M21 9v6"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  billing: <><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9h19M7 15h3"/></>,
  formats: <><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></>,
  eventTypes: <><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="8"/></>,
  rates: <><path d="M12 2v20M17 6.5c-.9-1-2.3-1.5-4-1.5-2.4 0-4 1.3-4 3 0 4.5 8 2.2 8 6.8 0 1.9-1.7 3.2-4.1 3.2-2 0-3.7-.7-4.9-2"/></>,
  invitations: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.18.37.4.7.7 1 .3.3.68.5 1.1.6h.1v4h-.1c-.42.1-.8.3-1.1.6-.3.3-.52.63-.7 1Z"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  chevron: <><path d="m9 18 6-6-6-6"/></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  event: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m8 15 2.2 2.2L16 12"/></>,
  money: <><circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.7-.8-1.8-1.2-3-1.2-1.8 0-3 1-3 2.3 0 3.4 6 1.6 6 5 0 1.4-1.3 2.4-3.1 2.4-1.5 0-2.8-.5-3.7-1.5M12.7 5.5v2M12.7 17v2"/></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 14v5h14v-5"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  dots: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
};

export default function AppIcon({ name, size = 20, className = '', strokeWidth = 1.8 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name] || ICONS.home}
    </svg>
  );
}

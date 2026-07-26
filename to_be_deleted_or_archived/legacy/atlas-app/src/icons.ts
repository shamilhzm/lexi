// Cartographic line iconography (DESIGN-SYSTEM §6): instruments and marks off
// a survey map — single-weight stroke, rounded caps, no fills except stipple.
const ICONS: Record<string, string> = {
  // tabs
  map: '<path d="M3.5 6.2l5.7-2.2 5.6 2.2 5.7-2.2v13.8l-5.7 2.2-5.6-2.2-5.7 2.2V6.2z"/><line x1="9.2" y1="4" x2="9.2" y2="17.8"/><line x1="14.8" y1="6.2" x2="14.8" y2="20"/>',
  practice: '<path d="M5 19.5c7.5 0 1.5-7.5 9-7.5 4.5 0 5-4.5 5-7.5"/><circle cx="5" cy="19.5" r="1.7"/><circle cx="19" cy="4.5" r="1.7"/><circle cx="12.2" cy="13.6" r="0.8" fill="currentColor" stroke="none"/>',
  add: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8.4" x2="12" y2="15.6"/><line x1="8.4" y1="12" x2="15.6" y2="12"/>',
  explore: '<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
  profile: '<circle cx="12" cy="12" r="9"/><path d="M8.4 13.6a3.6 3.6 0 007.2 0"/><circle cx="12" cy="9" r="2.4"/>',
  // tools
  sound: '<path d="M4 9.5v5h3l5 3.5v-12L7 9.5H4z"/><path d="M16 9.5a4 4 0 010 5"/>',
  undo: '<path d="M9 7 4 11l5 4"/><path d="M4 11h10a5 5 0 015 5v1"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 6.5"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2.2"/><circle cx="8.6" cy="10" r="1.7"/><path d="M4.5 17l4.5-4.2 3 2.6L16 11l4 4.4"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="16" y1="16" x2="21" y2="21"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none"/>',
  back: '<path d="M14.5 6l-6 6 6 6"/>',
  sliders: '<line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/><circle cx="9" cy="8" r="2.2"/><circle cx="15" cy="16" r="2.2"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><line x1="16" y1="16" x2="21" y2="21"/><line x1="8.4" y1="11" x2="13.6" y2="11"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><line x1="16" y1="16" x2="21" y2="21"/><line x1="11" y1="8.4" x2="11" y2="13.6"/><line x1="8.4" y1="11" x2="13.6" y2="11"/>',
  // survey marks
  star: '<path d="M12 4.5l7 13.5H5z"/><circle cx="12" cy="14" r="1.1" fill="currentColor" stroke="none"/>',
  // the daily dispatch: a folded letter with route lines
  dispatch: '<path d="M4 7.5l8-3.5 8 3.5v9l-8 3.5-8-3.5v-9z"/><path d="M4 7.5l8 3.5 8-3.5"/><line x1="12" y1="11" x2="12" y2="20"/>',
  // shell panels
  panelClose: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><line x1="9.5" y1="4.5" x2="9.5" y2="19.5"/><path d="M16 10l-2.2 2 2.2 2"/>',
  panelOpen: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><line x1="9.5" y1="4.5" x2="9.5" y2="19.5"/><path d="M13.8 10l2.2 2-2.2 2"/>',
  // paper objects
  seal: '<circle cx="12" cy="10" r="5.5"/><circle cx="12" cy="10" r="2.2"/><path d="M9.5 14.8L8 21l4-2.2L16 21l-1.5-6.2"/>',
  // concept-card attributes
  book: '<path d="M5 4.5h8.5a1.5 1.5 0 011.5 1.5V19H6.5A1.5 1.5 0 015 17.5V4.5z"/><line x1="8" y1="9" x2="12" y2="9"/>',
  quote: '<path d="M6 8h4v4l-2 3.5H6V8z"/><path d="M14 8h4v4l-2 3.5h-2V8z"/>',
  syn: '<path d="M4 9h12l-3-3M20 15H8l3 3"/>',
  ant: '<line x1="5" y1="19" x2="19" y2="5"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>',
  link: '<path d="M10 14a3.5 3.5 0 010-5l2-2a3.5 3.5 0 015 5l-1 1"/><path d="M14 10a3.5 3.5 0 010 5l-2 2a3.5 3.5 0 01-5-5l1-1"/>',
  chart: '<line x1="6" y1="20" x2="6" y2="13"/><line x1="11" y1="20" x2="11" y2="6"/><line x1="16" y1="20" x2="16" y2="10"/>'
};

export function icon(name: string, cls = ''): string {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

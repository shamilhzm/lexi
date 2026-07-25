// The day-2 return mechanism, without a backend.
//
// Lexi is local-first: there is no server, so there is nothing to send a push
// from. Rather than pretend otherwise, this ships the two things that genuinely
// work offline, and is honest in the UI about what each one covers:
//
//  1. A calendar event (.ics). The learner's own calendar owns it, so it fires
//     with Lexi closed, on any device they sync to — including iOS without an
//     installed PWA. This is the one that actually reaches people.
//  2. A local notification, fired while the app is open or installed and the
//     chosen time has passed with no reviews done. Cheap, immediate, and
//     limited: a closed tab can't fire anything.
//
// Real Web Push (VAPID + a serverless endpoint) is deliberately out of scope
// here — see the backlog. It would be the third leg, not a replacement.
import { reminderTime, reviewedToday } from '../store.ts';

const TITLE = 'Deutsch lernen — Lexi';

// ---- calendar ------------------------------------------------------------

/** iCalendar wants CRLF, and lines folded at 75 octets. Our lines are short,
 *  so only the line endings matter here. */
const ics = (lines: string[]) => lines.join('\r\n') + '\r\n';

const pad = (n: number) => String(n).padStart(2, '0');
const stampUTC = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** A daily repeating event at `time`, starting today (or tomorrow if that hour
 *  has already passed). DTSTART is deliberately *floating* — no Z, no TZID — so
 *  it recurs at that wall-clock time wherever the learner happens to be, which
 *  is what a study habit means. */
export function reminderIcs(time: string, url?: string): string {
  // Resolved lazily: a default parameter of `location.href` throws anywhere
  // without a DOM (tests, a worker, prerendering).
  const link = url ?? (typeof location !== 'undefined' ? location.href : 'https://lexi.app');
  const [h, m] = time.split(':').map(Number);
  const start = new Date();
  start.setHours(h, m, 0, 0);
  if (start.getTime() <= Date.now()) start.setDate(start.getDate() + 1);

  const local = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  return ics([
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lexi//Deutsch//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:lexi-daily-${start.getTime()}@lexi.local`,
    `DTSTAMP:${stampUTC(new Date())}`,
    `DTSTART:${local(start)}`,
    `DURATION:PT10M`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${TITLE}`,
    `DESCRIPTION:Ten minutes of German. Your reviews are waiting.\\n${link}`,
    `URL:${link}`,
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${TITLE}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]);
}

/** Hand the .ics to the OS. On iOS Safari this opens the Calendar import sheet. */
export function downloadReminderIcs(time: string) {
  const blob = new Blob([reminderIcs(time)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lexi-daily.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---- local notification --------------------------------------------------

export type NotifyState = 'unsupported' | 'default' | 'granted' | 'denied';

export function notifyState(): NotifyState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as NotifyState;
}

/** Ask for permission. Only ever call this from a real user gesture — a prompt
 *  on page load is the reason most people have notifications blocked. */
export async function requestNotify(): Promise<NotifyState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try { return (await Notification.requestPermission()) as NotifyState; }
  catch { return notifyState(); }
}

/** Don't nag twice in a day, across reloads. */
const FIRED_KEY = 'lexi.reminder.fired.v1';
const today = () => new Date().toISOString().slice(0, 10);

async function show() {
  const body = 'Ten minutes of German. Your reviews are waiting.';
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    // showNotification via the SW registration is the only form Android Chrome
    // accepts for an installed PWA; the constructor is the desktop fallback.
    if (reg?.showNotification) await reg.showNotification(TITLE, { body, tag: 'lexi-daily' });
    else new Notification(TITLE, { body, tag: 'lexi-daily' });
  } catch { /* a blocked notification is not worth surfacing */ }
}

/** Fire once today if the chosen time has passed and nothing has been reviewed.
 *  Returns true if a notification was shown. */
export async function maybeNotify(): Promise<boolean> {
  const time = reminderTime();
  if (!time || notifyState() !== 'granted') return false;
  if (localStorage.getItem(FIRED_KEY) === today()) return false;
  if (reviewedToday()) return false;

  const [h, m] = time.split(':').map(Number);
  const due = new Date();
  due.setHours(h, m, 0, 0);
  if (Date.now() < due.getTime()) return false;

  localStorage.setItem(FIRED_KEY, today());
  await show();
  return true;
}

/** Poll while the app is open. A minute's granularity is plenty for a habit
 *  cue, and the check is three localStorage reads. Returns a cleanup function. */
export function startReminderWatch(): () => void {
  void maybeNotify();
  const id = setInterval(() => { void maybeNotify(); }, 60_000);
  return () => clearInterval(id);
}

// The .ics is handed to the learner's real calendar, which is unforgiving: a
// missing CRLF or a stray timezone and the event either fails to import or
// fires at the wrong hour in a different country.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { reminderIcs } from './reminder.ts';

afterEach(() => { vi.useRealTimers(); });

/** Freeze the clock so DTSTART is deterministic. */
function at(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe('reminderIcs', () => {
  it('is a well-formed daily VEVENT with an alarm', () => {
    at('2026-07-25T08:00:00');
    const s = reminderIcs('19:00', 'https://lexi.example/');
    expect(s.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(s.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(s).toContain('RRULE:FREQ=DAILY');
    expect(s).toContain('BEGIN:VALARM');
    expect(s).toContain('ACTION:DISPLAY');
    expect(s).toContain('URL:https://lexi.example/');
  });

  it('uses CRLF line endings throughout, as iCalendar requires', () => {
    at('2026-07-25T08:00:00');
    const s = reminderIcs('19:00');
    // every \n must be preceded by \r
    expect(/[^\r]\n/.test(s)).toBe(false);
    expect(s.split('\r\n').length).toBeGreaterThan(10);
  });

  it('starts today when the time is still ahead', () => {
    at('2026-07-25T08:00:00');
    expect(reminderIcs('19:00')).toContain('DTSTART:20260725T190000');
  });

  it('rolls to tomorrow when the time has already passed', () => {
    at('2026-07-25T20:30:00');
    expect(reminderIcs('19:00')).toContain('DTSTART:20260726T190000');
  });

  it('keeps DTSTART floating so it recurs at local wall-clock time', () => {
    at('2026-07-25T08:00:00');
    // 07:05 is already behind us, so this lands tomorrow — see the roll-over test.
    const dtstart = reminderIcs('07:05').match(/DTSTART:[^\r]*/)![0];
    expect(dtstart).toBe('DTSTART:20260726T070500');
    expect(dtstart).not.toContain('Z');      // not UTC
    expect(dtstart).not.toContain('TZID');   // not pinned to one zone
  });

  it('zero-pads single-digit months, days and hours', () => {
    at('2026-01-05T02:00:00');
    expect(reminderIcs('09:07')).toContain('DTSTART:20260105T090700');
  });
});

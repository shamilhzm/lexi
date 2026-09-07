// Study time — the habit anchor.
//
// Spaced repetition only works if you come back, and Lexi had nothing that
// asked you to. This sets one time of day and offers two ways to be reminded
// of it, described plainly, because they cover different situations and
// pretending otherwise would just teach the learner to distrust the app:
// a calendar event reaches you with Lexi closed; a notification only fires
// while it’s open or installed.
import { useState } from 'react';
import { Bell, CalendarPlus, Check, Clock } from 'lucide-react';
import { reminderTime, setReminderTime } from '../store.ts';
import { useStore } from '../useStore.ts';
import { downloadReminderIcs, notifyState, requestNotify } from '../lib/reminder.ts';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';

/** iOS Safari in a *tab* exposes no `Notification`, so `notifyState()` returns
 *  `unsupported` and the card said **"This browser has no notification support"** —
 *  which is false, and false in the direction that costs the most. Safari has
 *  supported Web Push since 16.4, for web apps **installed to the Home Screen**. So
 *  the platform is not the wall; the install step is, and it is one the learner can
 *  actually take.
 *
 *  Detected rather than sniffed for a version: iPadOS reports itself as a Mac, and
 *  what matters is not "is this iOS" but "is this a WebKit browser that is not
 *  installed" — which is exactly the condition under which the install step is the
 *  right advice. A false positive tells a desktop Safari user to add to Home Screen,
 *  which is wrong-but-harmless; a false negative is the sentence we are removing. */
function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return false;           // already installed; the wall is elsewhere
  const touchMac = navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent);
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || touchMac;
}

export default function ReminderCard() {
  useStore();
  const saved = reminderTime();
  const [time, setTime] = useState(saved ?? '19:00');
  const [perm, setPerm] = useState(notifyState());
  const dirty = saved !== time;

  const enableNotifications = async () => {
    // In context, on a tap. Asking on page load is why most people have
    // notifications permanently blocked.
    setReminderTime(time);
    setPerm(await requestNotify());
  };

  return (
    <Card className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Clock size={16} className="text-accent" />
        <h2 className="text-base font-semibold">Study time</h2>
      </div>
      <p className="text-xs text-dim mb-3">
        Pick when you want to study. If the day is slipping, Lexi will say so — by
        whichever of the two below you turn on.
      </p>

      <div className="flex items-center gap-2.5 flex-wrap mb-3">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Daily study time"
          className="tap-44 bg-panel2 border border-line rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-accent" />
        {dirty && (
          <Button size="sm" onClick={() => setReminderTime(time)}>
            <Check size={13} /> Save
          </Button>
        )}
        {saved && !dirty && <span className="text-2xs text-green font-mono">saved · {saved}</span>}
        {saved && (
          <button onClick={() => { setReminderTime(null); setTime('19:00'); }}
            className="text-2xs text-dim hover:text-accent ml-auto">clear</button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <Card as="button" tone="sunken" nested pad="none" onClick={() => downloadReminderIcs(time)}
          className="flex items-start gap-2.5 px-3 py-2.5 text-left hover:border-accent transition-colors">
          <CalendarPlus size={15} className="text-accent flex-shrink-0 mt-0.5" />
          <span>
            <span className="block text-xs font-semibold">Add to calendar</span>
            <span className="block text-2xs text-dim">Repeats daily. Works with Lexi closed, on every device you sync.</span>
          </span>
        </Card>

        <Card as="button" tone="sunken" nested pad="none"
          onClick={enableNotifications} disabled={perm === 'granted' || perm === 'unsupported'}
          className="flex items-start gap-2.5 px-3 py-2.5 text-left hover:border-accent transition-colors disabled:opacity-60 disabled:hover:border-line">
          <Bell size={15} className="text-accent flex-shrink-0 mt-0.5" />
          <span>
            <span className="block text-xs font-semibold">
              {perm === 'granted' ? 'Notifications on'
                : perm === 'denied' ? 'Notifications blocked'
                : perm === 'unsupported' ? (isIosSafari() ? 'Add Lexi to your Home Screen' : 'Notifications unavailable')
                : 'Enable notifications'}
            </span>
            <span className="block text-2xs text-dim">
              {perm === 'granted' ? 'Fires at your study time, unless you have already reviewed.'
                : perm === 'denied' ? 'Re-allow Lexi in your browser settings to use this.'
                : perm === 'unsupported' ? (isIosSafari()
                    ? 'iOS only allows notifications for installed web apps. Share → Add to Home Screen, then come back.'
                    : 'This browser has no notification support.')
                : 'Only while Lexi is open or installed to your home screen.'}
            </span>
          </span>
        </Card>
      </div>
    </Card>
  );
}

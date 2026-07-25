// Study time — the habit anchor.
//
// Spaced repetition only works if you come back, and Lexi had nothing that
// asked you to. This sets one time of day and offers two ways to be reminded
// of it, described plainly, because they cover different situations and
// pretending otherwise would just teach the learner to distrust the app:
// a calendar event reaches you with Lexi closed; a notification only fires
// while it's open or installed.
import { useState } from 'react';
import { Bell, CalendarPlus, Check, Clock } from 'lucide-react';
import { reminderTime, setReminderTime } from '../store.ts';
import { useStore } from '../useStore.ts';
import { downloadReminderIcs, notifyState, requestNotify } from '../lib/reminder.ts';

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
    <div className="bg-panel border border-line rounded-md p-4 sm:p-5 mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Clock size={16} className="text-amber" />
        <h2 className="text-base font-semibold">Study time</h2>
      </div>
      <p className="text-xs text-dim mb-3">
        Pick when you want to study. Lexi will flag it on Home if the day is slipping.
      </p>

      <div className="flex items-center gap-2.5 flex-wrap mb-3">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Daily study time"
          className="bg-panel2 border border-line rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-amber" />
        {dirty && (
          <button onClick={() => setReminderTime(time)}
            className="flex items-center gap-1.5 bg-amber text-bg font-bold rounded-md px-3.5 py-2 text-xs hover:brightness-105">
            <Check size={13} /> Save
          </button>
        )}
        {saved && !dirty && <span className="text-2xs text-green font-mono">saved · {saved}</span>}
        {saved && (
          <button onClick={() => { setReminderTime(null); setTime('19:00'); }}
            className="text-2xs text-dim hover:text-amber ml-auto">clear</button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <button onClick={() => downloadReminderIcs(time)}
          className="flex items-start gap-2.5 bg-panel2 border border-line rounded-md px-3 py-2.5 text-left hover:border-amber transition-colors">
          <CalendarPlus size={15} className="text-amber flex-shrink-0 mt-0.5" />
          <span>
            <span className="block text-xs font-semibold">Add to calendar</span>
            <span className="block text-2xs text-dim">Repeats daily. Works with Lexi closed, on every device you sync.</span>
          </span>
        </button>

        <button onClick={enableNotifications} disabled={perm === 'granted' || perm === 'unsupported'}
          className="flex items-start gap-2.5 bg-panel2 border border-line rounded-md px-3 py-2.5 text-left hover:border-amber transition-colors disabled:opacity-60 disabled:hover:border-line">
          <Bell size={15} className="text-amber flex-shrink-0 mt-0.5" />
          <span>
            <span className="block text-xs font-semibold">
              {perm === 'granted' ? 'Notifications on'
                : perm === 'denied' ? 'Notifications blocked'
                : perm === 'unsupported' ? 'Notifications unavailable'
                : 'Enable notifications'}
            </span>
            <span className="block text-2xs text-dim">
              {perm === 'granted' ? 'Fires at your study time, unless you have already reviewed.'
                : perm === 'denied' ? 'Re-allow Lexi in your browser settings to use this.'
                : perm === 'unsupported' ? 'This browser has no notification support.'
                : 'Only while Lexi is open or installed to your home screen.'}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

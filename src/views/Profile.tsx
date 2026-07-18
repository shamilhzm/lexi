// Profile — the local learner profile, built implicitly at onboarding (CEFR level
// from placement, streak from visits) with an editable display name. Settings and
// data backup live inside it (reached from the sidebar's profile button).
import { useState } from 'react';
import { Flame, Pencil, Check, Heart, Compass, Target } from 'lucide-react';
import { profileName, setProfileName, placementLevel, streak, totals, goal, setGoal } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt } from '../lib/ui.ts';
import { ALL_LEVELS, type CEFR } from '../types.ts';
import TopicPicker from '../components/TopicPicker.tsx';
import Settings from './Settings.tsx';

export default function Profile() {
  useStore();
  const name = profileName();
  const level = placementLevel();
  const t = totals();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const save = () => { setProfileName(draft); setEditing(false); };
  const initial = (name || 'L').trim().charAt(0).toUpperCase();

  return (
    <div className="max-w-[640px] mx-auto">
      <h1 className="text-[20px] font-bold mb-4">Profile</h1>

      <div className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-3 flex items-center gap-4">
        <div className="grid place-items-center w-14 h-14 rounded-full bg-panel2 text-amber text-[22px] font-bold flex-shrink-0">{initial}</div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                placeholder="Your name" maxLength={40}
                className="bg-panel2 border border-line rounded-md px-2.5 py-1.5 text-[15px] outline-none focus:border-amber w-full max-w-[240px]" />
              <button onClick={save} className="grid place-items-center w-9 h-9 rounded-md bg-amber text-bg flex-shrink-0" title="Save"><Check size={16} /></button>
            </div>
          ) : (
            <button onClick={() => { setDraft(name); setEditing(true); }} className="group flex items-center gap-2 text-left">
              <span className={`text-[18px] font-bold ${name ? '' : 'text-dim'}`}>{name || 'Add your name'}</span>
              <Pencil size={14} className="text-dim group-hover:text-amber" />
            </button>
          )}
          <div className="text-[13px] text-dim mt-1.5 flex items-center gap-3 flex-wrap">
            <span>{level ? `Level ${level}` : 'No placement yet'}</span>
            <span className="flex items-center gap-1 text-amber"><Flame size={13} /> {streak()} day streak</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <Stat label="Known" value={t.known} />
        <Stat label="Learned" value={t.learned} />
        <Stat label="Due" value={t.due} />
      </div>

      {/* One clear goal (level + date) → the pace sentence on Today. */}
      <GoalCard />

      {/* Interest topics — bias the daily fresh-vocabulary pick. */}
      <div className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Compass size={16} className="text-amber" />
          <h2 className="text-[15px] font-semibold">Topics you care about</h2>
        </div>
        <p className="text-[13px] text-dim mb-3">Lexi pulls your new words from these first.</p>
        <TopicPicker />
      </div>

      {/* Settings + data backup live inside the profile. */}
      <Settings />

      <a href="https://github.com/shamilhzm/lexi" target="_blank" rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-dim hover:text-amber">
        <Heart size={13} /> Support Lexi's development
      </a>
    </div>
  );
}

function GoalCard() {
  const g = goal();
  const [level, setLevel] = useState<CEFR>(g?.level ?? 'B1');
  const [date, setDate] = useState(g?.date ?? '');
  const today = new Date().toISOString().slice(0, 10);
  const valid = date > today;
  const dirty = !g || g.level !== level || g.date !== date;
  return (
    <div className="bg-panel border border-line rounded-[16px] p-4 sm:p-5 mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Target size={16} className="text-amber" />
        <h2 className="text-[15px] font-semibold">Your goal</h2>
      </div>
      <p className="text-[13px] text-dim mb-3">A level and a date — Today shows whether your pace gets you there.</p>
      <div className="flex items-center gap-2.5 flex-wrap">
        <select value={level} onChange={(e) => setLevel(e.target.value as CEFR)}
          className="bg-panel2 border border-line rounded-md px-2.5 py-2 text-[14px] outline-none focus:border-amber">
          {ALL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="text-dim text-[13px]">by</span>
        <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)}
          className="bg-panel2 border border-line rounded-md px-2.5 py-1.5 text-[14px] outline-none focus:border-amber" />
        {dirty && valid && (
          <button onClick={() => setGoal({ level, date })}
            className="bg-amber text-bg font-bold rounded-md px-3.5 py-2 text-[13px] hover:brightness-105">Set</button>
        )}
        {g && (
          <button onClick={() => { setGoal(null); setDate(''); }}
            className="text-[13px] text-dim underline underline-offset-2 hover:text-amber">Clear</button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-panel border border-line rounded-[12px] px-3 py-3 text-center">
      <div className="text-[11px] text-dim uppercase tracking-[1px]">{label}</div>
      <div className="font-mono font-bold text-[22px] mt-0.5 tabular-nums">{fmt(value)}</div>
    </div>
  );
}

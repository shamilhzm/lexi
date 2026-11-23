// Profile — the local learner profile, built implicitly at onboarding (CEFR level
// from placement, streak from visits) with an editable display name. Settings and
// data backup live inside it (reached from the sidebar’s profile button).
import { useState } from 'react';
import { Flame, Pencil, Check, Heart, Compass, Target, SlidersHorizontal, ChevronRight, Scale, Feather } from 'lucide-react';
import { FOCUS } from '../lib/focus.ts';
import { profileName, setProfileName, placementLevel, streak, totals, goal, setGoal, localDayKey } from '../store.ts';
import { useStore } from '../useStore.ts';
import { supportLinkShown } from '../lib/platform.ts';
import { fmt, initialOf } from '../lib/ui.ts';
import { ALL_LEVELS, type CEFR } from '../types.ts';
import TopicPicker from '../components/TopicPicker.tsx';
import ReminderCard from '../components/ReminderCard.tsx';
import FlaggedCards from '../components/FlaggedCards.tsx';
import WantedWords from '../components/WantedWords.tsx';
import StrandedFavourites from '../components/StrandedFavourites.tsx';

import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import IconButton from '../components/ui/IconButton.tsx';
import Kicker from '../components/ui/Kicker.tsx';

export default function Profile({ onSettings }: { onSettings: () => void }) {
  useStore();
  const name = profileName();
  const level = placementLevel();
  const t = totals();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const save = () => { setProfileName(draft); setEditing(false); };
  const initial = initialOf(name);

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <h1 className="display text-3xl sm:text-4xl mb-4">Profile</h1>

      <Card className="mb-3 flex items-center gap-4">
        <div className="grid place-items-center w-[56px] h-[56px] rounded-full bg-panel2 text-accent text-[24px] leading-none font-bold flex-shrink-0">{initial}</div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="profile-name">Your name</label>
              {/* eslint-disable-next-line jsx-a11y/no-autofocus --
                  this input only exists because the learner just pressed
                  "edit name"; moving focus into it is following the action they
                  took, not stealing focus on page load. */}
              <input id="profile-name" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                placeholder="Your name" maxLength={40}
                className="tap-44 bg-panel2 border border-line rounded-md px-2.5 py-1.5 text-base outline-none focus:border-accent w-full max-w-[240px]" />
              <IconButton label="Save name" onClick={save} className="bg-key text-key-ink hover:text-key-ink"><Check size={16} /></IconButton>
            </div>
          ) : (
            <button onClick={() => { setDraft(name); setEditing(true); }} className="tap-44 group flex items-center gap-2 text-left">
              <span className={`text-lg font-bold ${name ? '' : 'text-dim'}`}>{name || 'Add your name'}</span>
              <Pencil size={14} className="text-dim group-hover:text-accent" />
            </button>
          )}
          <div className="text-xs text-dim mt-1.5 flex items-center gap-3 flex-wrap">
            <span>{level ? `Level ${level}` : 'No placement yet'}</span>
            <span className="flex items-center gap-1 text-accent"><Flame size={13} /> {streak()} day streak</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <Stat label="Known" value={t.known} />
        <Stat label="Learned" value={t.learned} />
        <Stat label="Due" value={t.due} />
      </div>

      {/* One clear goal (level + date) → the pace sentence on Fortschritt. */}
      <GoalCard />

      {/* Interest topics — bias the daily fresh-vocabulary pick. */}
      <Card className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Compass size={16} className="text-accent" />
          <h2 className="text-base font-semibold">Topics you care about</h2>
        </div>
        <p className="text-xs text-dim mb-3">Lexi pulls your new words from these first.</p>
        <TopicPicker />
      </Card>

      <ReminderCard />
      <StrandedFavourites />
      <WantedWords />
      <FlaggedCards />

      {/* Settings is a *page*, not the rest of this one.
          It used to render inline here, which put fourteen headings and 3.7
          screens of scroll behind one tab — the profile and the whole settings
          surface, indistinguishable, with "Your goal" and "Daily pace" at the
          same level. A row is the honest shape: settings are things you go and
          change, not things you read on the way past. */}
      <Card as="button" pad="none" onClick={onSettings}
        className="w-full flex items-center gap-3 px-4 py-3.5 mb-3 text-left hover:border-accent transition-colors">
        <span className="grid place-items-center w-[36px] h-[36px] rounded-md bg-panel2 text-accent flex-shrink-0">
          <SlidersHorizontal size={17} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-semibold">Settings</span>
          {/* Names what is behind the door today. It listed "pace, drills" for six
              weeks after `lib/focus.ts` hid both. */}
          <span className="block text-2xs text-dim">
            Appearance, text size{FOCUS.tuning ? ', pace' : ''}{FOCUS.grammar ? ', drills' : ''}, voice, offline, backup
          </span>
        </span>
        <ChevronRight size={16} className="text-dim flex-shrink-0" />
      </Card>

      {/* Absent from a store copy, where it reads as a donation ask (lib/platform.ts).
          This said "Support Lexi’s development" and opened the repo front page, which
          supports nothing: there is no Sponsors page yet (.github/FUNDING.yml is a
          placeholder the owner fills). A caption has to describe what it does, so it
          now goes to the page that says what Lexi costs and every way to help. */}
      {supportLinkShown() && (
      <a href="https://github.com/shamilhzm/lexi/blob/main/docs/COSTS.md" target="_blank" rel="noopener noreferrer"
        className="tap-44 mt-4 flex items-center justify-center gap-1.5 text-xs text-dim hover:text-accent">
        <Heart size={13} /> What Lexi costs, and how to help
      </a>
      )}
      {/* The about page and Gans, its goose — a static page written after the build
          (scripts/pages/about.ts). It reads nothing the learner owns. */}
      <a href="./about.html" target="_blank" rel="noopener"
        className="tap-44 flex items-center justify-center gap-1.5 text-xs text-dim hover:text-accent">
        <Feather size={13} /> About Lexi · meet Gans
      </a>
      {/* Privacy notice, credits (CC BY-SA and CC BY ask for them where the data is
          used) and the Impressum — one static page, public/legal.html. */}
      <a href="./legal.html" target="_blank" rel="noopener"
        className="tap-44 flex items-center justify-center gap-1.5 text-xs text-dim hover:text-accent">
        <Scale size={13} /> Privacy, credits &amp; legal notice
      </a>
    </div>
  );
}

function GoalCard() {
  const g = goal();
  const [level, setLevel] = useState<CEFR>(g?.level ?? 'B1');
  const [date, setDate] = useState(g?.date ?? '');
  const today = localDayKey();   // a date input's value is a local date
  const valid = date > today;
  const dirty = !g || g.level !== level || g.date !== date;
  return (
    <Card className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Target size={16} className="text-accent" />
        <h2 className="text-base font-semibold">Your goal</h2>
      </div>
      {/* It said "Today shows" — the briefing that went on 2026-09-05. The sentence
          has lived on Fortschritt since; the card kept pointing at a screen that
          no longer exists (found on the simulator, 2026-11-14). */}
      <p className="text-xs text-dim mb-3">Set a level and a date, and Fortschritt shows whether your pace gets you there.</p>
      <div className="flex items-center gap-2.5 flex-wrap">
        <label className="sr-only" htmlFor="goal-level">Target level</label>
        <select id="goal-level" value={level} onChange={(e) => setLevel(e.target.value as CEFR)}
          className="tap-44 bg-panel2 border border-line rounded-md px-2.5 py-2 text-sm outline-none focus:border-accent">
          {ALL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="text-dim text-xs" aria-hidden>by</span>
        <label className="sr-only" htmlFor="goal-date">Target date</label>
        {/* iOS draws an empty date field as an empty box — no placeholder, no
            glyph — so an unset goal read as a blank beige rectangle after the word
            "by". The hint sits under the field and lets every tap through. */}
        <span className="relative inline-flex">
          <input id="goal-date" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)}
            className="tap-44 min-w-[9.5rem] bg-panel2 border border-line rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-accent" />
          {!date && (
            <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center px-2.5 text-sm text-dim">
              pick a date
            </span>
          )}
        </span>
        {dirty && valid && <Button size="sm" onClick={() => setGoal({ level, date })}>Set</Button>}
        {g && (
          <button onClick={() => { setGoal(null); setDate(''); }}
            className="text-xs text-dim underline underline-offset-2 hover:text-accent">Clear</button>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card pad="none" className="px-3 py-3 text-center">
      <Kicker className="block">{label}</Kicker>
      <div className="font-mono font-bold text-2xl mt-0.5 tabular-nums">{fmt(value)}</div>
    </Card>
  );
}

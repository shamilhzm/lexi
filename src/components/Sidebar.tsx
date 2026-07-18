// Left navigation — a modern collapsible sidebar. On desktop it's a persistent
// rail that collapses to icons; on a phone it slides in as an overlay drawer
// (opened by the hamburger in the main top bar). Holds the "Start session" CTA,
// the primary destinations (Home / Explore / Fundamentals), and the profile.
//
// Collapse is a *desktop* concern: the collapsed state hides labels via `sm:hidden`
// so the mobile drawer (always full width) always shows them.
import { Play, Sunrise, LayoutGrid, GraduationCap, BarChart3, ChevronLeft, ChevronRight, Flame, X } from 'lucide-react';
import type { View } from '../App.tsx';

export function LexiMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 150 150" width={size} height={size} role="img" aria-label="Lexi" className={`flex-shrink-0 ${className}`}>
      <rect width="150" height="150" rx="34" fill="#0e1722" />
      <rect x="52" y="40" width="20" height="72" rx="3" fill="#38cde8" />
      <rect x="52" y="92" width="60" height="20" rx="3" fill="#38cde8" />
      <rect x="88" y="40" width="20" height="22" rx="3" fill="#38cde8" />
    </svg>
  );
}

const NAV: { id: View; label: string; icon: any }[] = [
  { id: 'home', label: 'Home', icon: Sunrise },
  { id: 'explore', label: 'Explore', icon: LayoutGrid },
  { id: 'fundamentals', label: 'Fundamentals', icon: GraduationCap },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
];

export default function Sidebar({
  view, onGo, onStartSession, collapsed, onToggleCollapse, mobileOpen, onMobileClose, onProfile,
  name, level, streak,
}: {
  view: View; onGo: (v: View) => void; onStartSession: () => void;
  collapsed: boolean; onToggleCollapse: () => void; mobileOpen: boolean; onMobileClose: () => void;
  onProfile: () => void; name: string; level: string | null; streak: number;
}) {
  const initial = (name || 'L').trim().charAt(0).toUpperCase();
  const hideLabel = collapsed ? 'sm:hidden' : '';       // hide on desktop when collapsed
  const centre = collapsed ? 'sm:justify-center' : '';  // centre icons on desktop when collapsed

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={onMobileClose} aria-hidden />}
      <aside
        className={`flex flex-col bg-panel border-r border-line flex-shrink-0 z-50 w-[240px]
          fixed inset-y-0 left-0 sm:relative
          transition-transform duration-200 sm:transition-[width]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0
          ${collapsed ? 'sm:w-[64px]' : 'sm:w-[240px]'}`}>

        {/* Brand — the mark stays visible even when collapsed; only the wordmark hides.
            min-height adds the safe-area inset so the notch never clips the logo. */}
        <div className={`flex items-center gap-2.5 px-3.5 pb-2 min-h-[calc(56px_+_env(safe-area-inset-top))] flex-shrink-0 safe-top border-b border-line ${collapsed ? 'sm:px-0 sm:justify-center' : ''}`}>
          <LexiMark size={28} />
          <span className={`font-bold text-[20px] tracking-wide leading-none ${hideLabel}`}>Lexi</span>
          <button onClick={onMobileClose} className="ml-auto grid place-items-center w-9 h-9 -mr-1 text-dim hover:text-amber sm:hidden" title="Close"><X size={18} /></button>
        </div>

        {/* Desktop collapse toggle — a chevron that straddles the rail's right edge */}
        <button onClick={onToggleCollapse} title={collapsed ? 'Expand' : 'Collapse'} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden sm:grid place-items-center absolute top-1/2 -translate-y-1/2 -right-3 z-50 w-6 h-6 rounded-full bg-panel border border-line text-dim hover:text-amber hover:border-amber transition-colors">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Start session — the primary action (launches Study) */}
        <div className="px-2.5 pt-3 pb-1">
          <button onClick={onStartSession} title="Start today's session"
            className="w-full flex items-center justify-center gap-2 bg-amber text-bg font-bold rounded-[10px] py-2.5 px-3 hover:brightness-105 transition">
            <Play size={16} /> <span className={`text-[14px] ${hideLabel}`}>Start session</span>
          </button>
        </div>

        {/* Destinations */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {NAV.map((n) => {
            const active = view === n.id;
            return (
              <button key={n.id} onClick={() => onGo(n.id)} title={n.label}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-[14px] transition-colors ${
                  active ? 'bg-panel2 text-amber' : 'text-dim hover:text-txt hover:bg-panel2'} ${centre}`}>
                <n.icon size={18} strokeWidth={active ? 2.4 : 1.8} className="flex-shrink-0" />
                <span className={hideLabel}>{n.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile (Settings live inside it) */}
        <div className="p-2 border-t border-line safe-bottom">
          <button onClick={onProfile} title="Profile"
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-panel2 transition-colors ${
              view === 'profile' ? 'bg-panel2' : ''} ${centre}`}>
            <span className="grid place-items-center w-8 h-8 rounded-full bg-panel2 text-amber text-[13px] font-bold flex-shrink-0">{initial}</span>
            <span className={`flex-1 min-w-0 text-left ${hideLabel}`}>
              <span className="block text-[13px] font-semibold truncate">{name || 'Your profile'}</span>
              <span className="flex items-center gap-1 text-[11px] text-dim">
                {level && <span>{level} ·</span>}
                <Flame size={11} className="text-amber" /> {streak}
              </span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

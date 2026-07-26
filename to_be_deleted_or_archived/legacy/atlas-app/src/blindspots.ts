// Structural error tracking. Ported from app/orbita.html.
// All functions are pure — no side effects, no imports from the rest of the app.

export interface BlindspotTag { tag: string; label: string; hint: string; }
export interface BlindspotEvent { tag: string; type: 'cloze' | 'transform' | 'reading'; ts: number; snippet?: string; sessionId?: string; }
export interface BlindspotTally { tag: string; label: string; count: number; recentCount: number; lastSeen: number; }

export const BLINDSPOT_TAGS: BlindspotTag[] = [
  { tag: 'konj-ii',        label: 'Konjunktiv II',                       hint: 'würde/hätte/wäre, irreale Bedingungen & Wünsche, Höflichkeit' },
  { tag: 'passiv',         label: 'Passiv & Ersatzformen',               hint: 'Vorgangs-/Zustandspassiv, Passiv mit Modalverben, sich lassen / sein…zu' },
  { tag: 'kasus-dekl',     label: 'Kasus & Deklination',                 hint: 'Dativ Plural +n, Adjektivendungen, n-Deklination, Genitiv' },
  { tag: 'konnektoren',    label: 'Konnektoren & Satzbau',               hint: 'Wortstellung/TeKaMoLo, zweiteilige Konnektoren (entweder…oder, je…desto)' },
  { tag: 'praepositionen', label: 'Präpositionen & Rektion',             hint: 'Wechselpräpositionen, feste Präpositionen, Verben/Adjektive mit Präposition' },
  { tag: 'verb-tempus',    label: 'Verben: Tempus & Modus',              hint: 'Perfekt vs. Präteritum, Plusquamperfekt, Futur II, Konjunktiv I (indirekte Rede)' },
  { tag: 'nebensatz',      label: 'Nebensätze & Wortstellung',           hint: 'Verbendstellung, Relativsätze, indirekte Fragen, Infinitiv mit zu' },
  { tag: 'partizip-attr',  label: 'Partizipien & erweiterte Attribute',  hint: 'Partizip I/II als Attribut, erweiterte Attribute, Partizipialkonstruktionen' },
  { tag: 'funktionsverb',  label: 'Funktionsverbgefüge & Kollokationen', hint: 'in Betracht ziehen, zur Verfügung stehen; feste Nomen-Verb-Verbindungen' },
  { tag: 'nominalstil',    label: 'Nominal- vs. Verbalstil',             hint: 'Nominalisierung, Nebensatz ↔ Nominalphrase (gehobenes C1-Register)' },
  { tag: 'wortschatz',     label: 'Wortschatz & Idiomatik',              hint: 'Synonyme/Nuancen, idiomatische Wendungen, Register' },
  { tag: 'zu-steil',       label: 'Zu steil (übersprungen)',             hint: 'Übersprungene Karten — zu schwer für jetzt; sie kommen wieder, wenn der Weg dorthin gebaut ist' },
];

// Comma-joined list for injection into generation prompts.
export function blindspotTagMenu(): string {
  return BLINDSPOT_TAGS.map((t) => `${t.tag} (${t.label})`).join('; ');
}

// Map a raw/model-supplied tag string onto a canonical tag key, else 'untagged'.
export function normalizeBlindspotTag(raw: string | undefined): string {
  if (!raw) return 'untagged';
  const k = String(raw).toLowerCase().trim().replace(/[\s_]+/g, '-');
  if (BLINDSPOT_TAGS.some((t) => t.tag === k)) return k;
  const SYN: Record<string, string> = {
    'konjunktiv-ii': 'konj-ii', 'konjunktiv-2': 'konj-ii', 'konjii': 'konj-ii', 'konj-2': 'konj-ii', subjunctive: 'konj-ii',
    passive: 'passiv', vorgangspassiv: 'passiv', zustandspassiv: 'passiv',
    kasus: 'kasus-dekl', deklination: 'kasus-dekl', declension: 'kasus-dekl', case: 'kasus-dekl',
    adjektivendung: 'kasus-dekl', adjektivendungen: 'kasus-dekl', genitiv: 'kasus-dekl', dativ: 'kasus-dekl', 'n-deklination': 'kasus-dekl',
    konnektor: 'konnektoren', connectors: 'konnektoren', satzbau: 'konnektoren', wortstellung: 'konnektoren', tekamolo: 'konnektoren',
    praeposition: 'praepositionen', praepositional: 'praepositionen', prepositions: 'praepositionen', rektion: 'praepositionen',
    tempus: 'verb-tempus', modus: 'verb-tempus', 'konjunktiv-i': 'verb-tempus', 'indirekte-rede': 'verb-tempus', perfekt: 'verb-tempus', praeteritum: 'verb-tempus',
    nebensaetze: 'nebensatz', relativsatz: 'nebensatz', relativsaetze: 'nebensatz', subordinate: 'nebensatz', verbendstellung: 'nebensatz',
    partizip: 'partizip-attr', partizipien: 'partizip-attr', 'erweiterte-attribute': 'partizip-attr', participle: 'partizip-attr',
    funktionsverbgefuege: 'funktionsverb', kollokation: 'funktionsverb', kollokationen: 'funktionsverb', collocation: 'funktionsverb',
    nominalisierung: 'nominalstil', verbalstil: 'nominalstil', nominalization: 'nominalstil',
    vocabulary: 'wortschatz', idiom: 'wortschatz', idiomatik: 'wortschatz', register: 'wortschatz', lexik: 'wortschatz',
  };
  if (SYN[k]) return SYN[k];
  const hit = BLINDSPOT_TAGS.find((t) => k.includes(t.tag));
  return hit ? hit.tag : 'untagged';
}

// Rank events by 30-day recency-weighted frequency. Pure — suitable for unit tests.
export function blindspotTally(events: BlindspotEvent[], now = Date.now(), windowDays = 30): BlindspotTally[] {
  const cutoff = now - windowDays * 86_400_000;
  const byTag: Record<string, { count: number; recentCount: number; lastSeen: number }> = {};
  for (const e of events) {
    const tag = e?.tag || 'untagged';
    const s = byTag[tag] ?? (byTag[tag] = { count: 0, recentCount: 0, lastSeen: 0 });
    s.count++;
    if (e.ts >= cutoff) s.recentCount++;
    if (e.ts > s.lastSeen) s.lastSeen = e.ts;
  }
  return Object.entries(byTag)
    .map(([tag, s]) => {
      const meta = BLINDSPOT_TAGS.find((t) => t.tag === tag);
      return { tag, label: meta ? meta.label : tag, ...s };
    })
    .sort((a, b) => b.recentCount - a.recentCount || b.count - a.count || b.lastSeen - a.lastSeen);
}

// Top N actionable patterns (recent, non-untagged).
export function blindspotTopFocus(tally: BlindspotTally[], n = 3): BlindspotTally[] {
  return tally.filter((t) => t.recentCount > 0 && t.tag !== 'untagged').slice(0, n);
}

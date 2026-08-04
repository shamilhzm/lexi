// Class packs — a deck you can hand to someone.
//
// Lexi is local-first, which is the right default and also the thing that makes it
// unshareable: there is no account to join, no class to be added to, and no way for
// the person sitting next to you at language school to get "this week's forty
// words". The honest bridge is a file. No backend, no sync, no accounts — a pack
// is just JSON that one learner exports and another imports.
//
// Packs are **self-contained**: they carry whole cards, not ids. Ids would be
// smaller, but they assume both people are running the same corpus build, and the
// corpus moves — a pack that silently drops half its words because the sender was
// a version ahead is worse than a bigger file.
//
// A pack carries no progress. What you studied is yours; what the deck contains is
// the shareable part. That also makes a pack safe to pass on: it says nothing about
// the person who made it beyond the name they chose to put on it.
import type { Word, CEFR } from '../types.ts';

export const PACK_FORMAT = 'lexi.pack';
export const PACK_VERSION = 1;

export interface ClassPack {
  format: typeof PACK_FORMAT;
  version: number;
  /** What the deck is — shown to the person importing it. */
  name: string;
  /** Who made it, if they set a profile name. Optional and never inferred. */
  from?: string;
  /** ISO date, so a recipient can see how old the pack is. */
  created: string;
  cards: Word[];
}

const LEVELS = new Set<CEFR>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const str = (v: unknown, max = 400): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

/** Everything a pack needs from a card, checked one field at a time.
 *
 *  An imported pack is untrusted input from another person's device: it goes
 *  straight into the lexicon the app renders and schedules, so a malformed row must
 *  be dropped rather than crash a session three cards later. */
function validCard(c: unknown): c is Word {
  const w = c as Word;
  if (!w || typeof w !== 'object') return false;
  if (!str(w.id, 200) || !str(w.term, 200)) return false;
  if (typeof w.en !== 'string') return false;
  if (!LEVELS.has(w.level)) return false;
  if (w.kind !== 'word' && w.kind !== 'grammar') return false;
  if (!str(w.field, 120)) return false;
  if (w.gender != null && !['der', 'die', 'das'].includes(w.gender)) return false;
  if (!Array.isArray(w.syn) || !Array.isArray(w.ant) || !Array.isArray(w.ex)) return false;
  return w.ex.every((e) => e && typeof e.de === 'string' && typeof e.en === 'string');
}

/** Build a pack from a set of cards. */
export function buildPack(name: string, cards: Word[], from?: string): ClassPack {
  return {
    format: PACK_FORMAT,
    version: PACK_VERSION,
    name: name.trim().slice(0, 120) || 'Untitled pack',
    ...(from?.trim() ? { from: from.trim().slice(0, 60) } : {}),
    created: new Date().toISOString().slice(0, 10),
    cards: cards.filter(validCard),
  };
}

export interface ParseResult {
  pack: ClassPack | null;
  /** Human-readable reason, when the file could not be read as a pack at all. */
  error?: string;
  /** Cards dropped by validation — reported rather than hidden. */
  dropped: number;
}

/** Read a pack from a file's text. Never throws. */
export function parsePack(text: string): ParseResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { pack: null, error: 'That file isn’t valid JSON.', dropped: 0 }; }
  const p = raw as ClassPack;
  if (!p || typeof p !== 'object' || p.format !== PACK_FORMAT) {
    return { pack: null, error: 'That isn’t a Lexi word pack.', dropped: 0 };
  }
  // Forward compatibility: refuse a newer pack rather than import half of it.
  if (typeof p.version !== 'number' || p.version > PACK_VERSION) {
    return { pack: null, error: 'That pack was made by a newer version of Lexi.', dropped: 0 };
  }
  if (!Array.isArray(p.cards)) return { pack: null, error: 'That pack has no cards in it.', dropped: 0 };

  const cards = p.cards.filter(validCard);
  const dropped = p.cards.length - cards.length;
  if (!cards.length) return { pack: null, error: 'None of the cards in that pack could be read.', dropped };
  return {
    pack: {
      format: PACK_FORMAT,
      version: p.version,
      name: str(p.name, 120) ? p.name.trim() : 'Imported pack',
      ...(str(p.from, 60) ? { from: p.from.trim() } : {}),
      created: str(p.created, 30) ? p.created : new Date().toISOString().slice(0, 10),
      cards,
    },
    dropped,
  };
}

/** A filename a recipient can recognise in a chat thread. */
export function packFilename(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `lexi-pack-${slug || 'deck'}.json`;
}

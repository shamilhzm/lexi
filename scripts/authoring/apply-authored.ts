// Merge a hand-authored card patch (produced by a Claude task following
// card-authoring.md) into public/data/vocab.json. Fill-only and validated: it
// never overwrites an existing non-empty field, and it rejects malformed values,
// so re-running is safe and the diff stays surgical. No network, no third-party
// LLM — the authored data is ours.
//
//   node scripts/authoring/apply-authored.ts <patch.json> [--dry]
import { readFileSync } from 'node:fs';
import { PATHS } from '../corpus/config.ts';
import { readJSON, writeJSON, stripArticle } from '../corpus/lib.ts';
import type { Word } from '../../src/types.ts';

interface Patch {
  id: string;
  def?: string;
  syn?: string[];
  ant?: string[];
  ipa?: string;
  plural?: string;
  gender?: 'der' | 'die' | 'das';
  ex?: { de: string; en: string; lvl: string }[];
}

const [patchPath, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry');
if (!patchPath) { console.error('Usage: node scripts/authoring/apply-authored.ts <patch.json> [--dry]'); process.exit(1); }

const vocab = readJSON<Word[]>(PATHS.vocab);
const byId = new Map(vocab.map((c) => [c.id, c]));
const patches: Patch[] = JSON.parse(readFileSync(patchPath, 'utf8'));

const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const isStr = (v: unknown, max = 400): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

let set = 0, skipped = 0, missing = 0;
const rejects: string[] = [];
const reject = (id: string, why: string) => { rejects.push(`${id}: ${why}`); };

for (const p of patches) {
  const c = byId.get(p.id);
  if (!c) { missing++; reject(p.id, 'no such card id'); continue; }
  const lemma = stripArticle(c.term);

  if (p.def !== undefined && !c.def) {
    if (isStr(p.def) && p.def.trim().toLowerCase() !== c.en.trim().toLowerCase()) { c.def = p.def.trim(); set++; }
    else { skipped++; reject(p.id, 'def rejected (empty or == en)'); }
  }
  if (p.syn !== undefined && (!c.syn || c.syn.length === 0)) {
    const syn = (p.syn ?? []).filter((s) => isStr(s, 40) && s.toLowerCase() !== lemma.toLowerCase()).map((s) => s.replace(/^(der|die|das)\s+/i, '').trim()).slice(0, 4);
    if (syn.length) { c.syn = syn; set++; }
  }
  if (p.ant !== undefined && (!c.ant || c.ant.length === 0)) {
    const ant = (p.ant ?? []).filter((s) => isStr(s, 40)).map((s) => s.replace(/^(der|die|das)\s+/i, '').trim()).slice(0, 2);
    if (ant.length) { c.ant = ant; set++; }
  }
  if (p.ipa !== undefined && !c.ipa) {
    if (isStr(p.ipa, 80)) { c.ipa = p.ipa.replace(/[/[\]]/g, '').trim(); set++; } else { skipped++; reject(p.id, 'ipa rejected'); }
  }
  if (p.plural !== undefined && c.pos === 'noun' && !c.plural) {
    if (isStr(p.plural, 60)) { c.plural = /^(die|der|das)\s/i.test(p.plural) ? p.plural.trim() : `die ${p.plural.trim()}`; set++; }
    else { skipped++; reject(p.id, 'plural rejected'); }
  }
  if (p.gender !== undefined && c.pos === 'noun' && !c.gender) {
    if (p.gender === 'der' || p.gender === 'die' || p.gender === 'das') { c.gender = p.gender; set++; } else { skipped++; reject(p.id, 'gender rejected'); }
  }
  if (p.ex !== undefined && (c.ex?.length ?? 0) < 2) {
    const have = new Set((c.ex ?? []).map((e) => e.de.trim()));
    const add = (p.ex ?? []).filter((e) => e && isStr(e.de, 200) && isStr(e.en, 200) && LEVELS.has(e.lvl) && !have.has(e.de.trim()))
      .map((e) => ({ de: e.de.trim(), en: e.en.trim(), lvl: e.lvl }));
    if (add.length) { c.ex = [...(c.ex ?? []), ...add]; set++; }
  }
}

console.log(`Patches: ${patches.length}  ·  fields set: ${set}  ·  skipped/rejected: ${skipped}  ·  missing ids: ${missing}`);
if (rejects.length) { console.log('Rejects:'); for (const r of rejects.slice(0, 40)) console.log('  ' + r); }
if (!dry) { writeJSON(PATHS.vocab, vocab); console.log(`Wrote ${PATHS.vocab}`); } else console.log('DRY RUN — vocab.json unchanged.');

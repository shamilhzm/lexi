// Every verb the conjugator calls reliable, checked against its attested table.
//
//   npm run corpus:conjugate-check
//
// `conjugate().reliable` is the conjugator's own opinion of itself, and on
// 2026-11-20 it was wrong for *lügen → lügte* and *wehtun → wehtute*: a strong
// verb missing from STRONG_GATE and a separable one whose prefix is not in
// SEPARABLE both come out as regular weak verbs, and say so with confidence.
// `inflections.json` is the Wiktionary table for the card, joined (*anrief*, not
// *rief an*), so the comparison is made on joined forms: the 3rd-person
// Präteritum and the Partizip II, the two forms a weak/strong mistake moves.
// 2026-11-21: 33 disagreed; after the conjugator fix, the one in RULED.
//
// A card with fewer than five attested forms is skipped, not passed: too thin a
// table to say a form is absent. `conjugate-check.test.ts` holds it at RULED.
//
// **Two pasts.** A table that holds a strong *and* a weak past is two verbs, or a
// standard and a regional form, and it attests whichever the conjugator picks:
// *schaffen* answered *schuf* (create) on a card that means *manage* and passed.
// So such a verb is listed until somebody rules which one its card means, in
// TWO_PASTS. Seen from a strong form: the table also has the regular *-te* past.
// Seen from a weak one: it also has the participle in *-en* on the same stem. A
// strong participle with a vowel change (*gewogen* beside *gewiegt*) is visible
// only from the strong side.
import './shim.ts';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildMatcher } from '../../src/lib/matcher.ts';
import { conjugate } from '../../src/lib/conjugate.ts';
import type { Word } from '../../src/types.ts';

/** Verbs whose attested table is another verb's, each read by eye. */
export const RULED: Record<string, string> = {
  // The page's table is the inseparable homograph (überkocht); the card is
  // *the milk boils over*, separable, and *übergekocht* is right for it.
  überkochen: 'table is the inseparable homograph',
};

/** Verbs whose table holds two pasts, each ruled for its card's sense. A ruling
 *  says which form the conjugator gives and why that is the card's. */
export const TWO_PASTS: Record<string, string> = {
  schaffen: 'schaffte: the card is A2 *manage*; *create* (schuf) is read via EXTRA_VERB_FORMS',
  hängen: 'hing: intransitive *hang*, the TABLE row says why; hängte is *hang up*',
  abhängen: 'hing ab: *depend*, the card\'s first sense; hängte ab is *take down, shake off*',
  wachsen: 'wuchs: *grow*; wachste is *to wax* (skis), another verb',
  wiegen: 'wog: *weigh*; wiegte is *rock* (a cradle)',
  weichen: 'wich: *give way*; weichte is *soften, soak*',
  schmelzen: 'schmolz: *melt*; schmelzte is the old transitive',
  schalten: 'schaltete: *switch*; geschalten is regional',
  falten: 'faltete: *fold*; gefalten is regional',
};

const strip = (t: string) => t.replace(/^(der|die|das)\s+/, '').replace(/^sich\s+/i, '').trim();
// `separable` is null on every irregular-table verb (*sah durch*), so the split
// is read from the form itself: a main-clause form with a space is stem + prefix.
const joined = (form: string) => {
  const parts = form.split(' ');
  return parts.length === 2 ? parts[1] + parts[0] : form;
};

export interface Disagreement { verb: string; generated: string[]; attested: string[] }

export function conjugateDisagreements(words: Word[], attested: Record<string, string[]>) {
  buildMatcher(words); // primes setKnownVerbs, as the app does at boot
  let checked = 0, thin = 0;
  const wrong: Disagreement[] = [];
  const twoPasts: { verb: string; generated: string; also: string }[] = [];
  const seen = new Set<string>();
  for (const w of words) {
    if (w.kind !== 'word' || w.pos !== 'verb') continue;
    const inf = strip(w.term);
    if (/\s|\+|\(/.test(inf) || seen.has(inf)) continue;
    seen.add(inf);
    const c = conjugate(inf);
    if (!c.reliable) continue;
    const table = new Set((attested[w.id] ?? []).map((f) => f.toLowerCase()));
    if (table.size < 5) { thin++; continue; }
    checked++;
    const pret3 = joined(c.praeteritum[2]).toLowerCase(), part = c.partizip.toLowerCase();
    let also: string | null = null;
    if (!pret3.endsWith('te')) {
      const stem = inf.toLowerCase().replace(/e?n$/, '');
      const weak = /[td]$|[^aeiouäöülrh][mn]$/.test(stem) ? `${stem}ete` : `${stem}te`;
      if (table.has(weak)) also = weak;
    } else if (part.endsWith('t')) {
      const strong = part.replace(/e?t$/, 'en');
      if (strong !== inf.toLowerCase() && table.has(strong)) also = strong;
    }
    if (also) twoPasts.push({ verb: inf, generated: `${pret3}, ${part}`, also });
    // The table leaves out the infinitive, so a participle spelled like it
    // (*übertragen*, *geraten*) is attested by the headword itself.
    table.add(inf.toLowerCase());
    const pret = joined(c.praeteritum[2]);
    const generated = [pret, c.partizip].filter((f) => !table.has(f.toLowerCase()));
    if (generated.length) wrong.push({ verb: inf, generated, attested: [...table].slice(0, 8) });
  }
  return { checked, thin, wrong, twoPasts };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const words: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
  const attested: Record<string, string[]> = JSON.parse(readFileSync('public/data/inflections.json', 'utf8'));
  const { checked, thin, wrong, twoPasts } = conjugateDisagreements(words, attested);
  console.log(`${checked} reliable verbs checked against their table · ${thin} with too thin a table to check`);
  console.log(`${wrong.length} disagree (${Object.keys(RULED).length} ruled):\n`);
  for (const d of wrong) {
    const note = RULED[d.verb] ? `   [ruled: ${RULED[d.verb]}]` : '';
    console.log(`  ${d.verb.padEnd(18)} generated ${d.generated.join(' · ').padEnd(28)} attested: ${d.attested.join(', ')}${note}`);
  }
  console.log(`\n${twoPasts.length} hold two pasts (${Object.keys(TWO_PASTS).length} ruled):\n`);
  for (const d of twoPasts) {
    const note = TWO_PASTS[d.verb] ? `   [ruled: ${TWO_PASTS[d.verb]}]` : '   UNRULED: which does the card mean?';
    console.log(`  ${d.verb.padEnd(18)} gives ${d.generated.padEnd(26)} table also ${d.also}${note}`);
  }
  if (wrong.some((d) => !RULED[d.verb]) || twoPasts.some((d) => !TWO_PASTS[d.verb])) process.exit(1);
}

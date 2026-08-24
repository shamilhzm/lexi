// Validation / CI harness (Goal 6). Runs schema + duplicate checks, reports the
// level/sector distribution and IPA/example presence rates, re-runs the reader's
// matching probe (conjugation, plural, adjective de-inflection) against the
// corpus, measures vocab.json size + gzip, and prints a random card sample for a
// human spot-check. Exits non-zero on hard errors (or on warnings with --strict).
//
//   npm run corpus:validate                 # report + gate on structural errors
//   npm run corpus:validate -- --strict     # also gate on warnings (use for new batches)
//   npm run corpus:validate -- --sample=15 --seed=7
import './shim.ts';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { ALLOWED_POS } from './config.ts';
import { loadCorpus, loadSectors, primeApp, readJSON, fileExists, stripArticle, lemmaKey, ARCHAIC_SPELLING, isGermanDefinition, isEnglishInGermanField, headwordEvidence, LEVELS, type Word } from './lib.ts';
import { findFormCollisions, pairKey, FORM_RULINGS } from './form-rulings.ts';
import type { Matcher } from '../../src/lib/matcher.ts';
import { conjugate, canConjugate } from '../../src/lib/conjugate.ts';

const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function sample<T>(a: T[], n: number, rng: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b.slice(0, n);
}

const isStr = (v: unknown) => typeof v === 'string';
const isArr = (v: unknown) => Array.isArray(v);

interface Issue { id: string; msg: string; }

/** Cards whose capital was ruled correct by hand — see casefix.ts / case-rulings.tsv. */
const RULED_CAPITAL = new Set(
  readFileSync(join(PATHS.corpusDir, 'case-rulings.tsv'), 'utf8')
    .split('\n')
    .map((l) => l.trim().split('\t'))
    .filter((c) => c[1] === 'keep')
    .map((c) => c[0]),
);

function schemaCheck(cards: Word[]): { errors: Issue[]; warnings: Issue[] } {
  const errors: Issue[] = [], warnings: Issue[] = [];
  for (const w of cards) {
    const id = (w as any)?.id ?? '(no id)';
    if (!isStr(w.id) || !w.id) errors.push({ id, msg: 'missing id' });
    if (!isStr(w.term) || !w.term) errors.push({ id, msg: 'missing term' });
    if (!LEVELS.includes(w.level)) errors.push({ id, msg: `bad level ${w.level}` });
    if (w.kind !== 'word' && w.kind !== 'grammar') errors.push({ id, msg: `bad kind ${w.kind}` });
    if (!isStr(w.field) || !w.field) errors.push({ id, msg: 'missing field' });
    if (!isArr(w.syn) || !isArr(w.ant) || !isArr(w.ex)) errors.push({ id, msg: 'syn/ant/ex not arrays' });
    for (const e of w.ex ?? []) if (!isStr(e?.de) || !isStr(e?.en)) errors.push({ id, msg: 'malformed example' });
    // Example hygiene. These are the classes that actually shipped — see
    // scripts/corpus/examples.ts for the audit and src/lib/examples.ts for the
    // runtime guard that absorbs them until the JSON is repaired. Hard errors are
    // the ones that render visibly wrong; the rest are warnings so --strict gates
    // new batches without failing the whole corpus today.
    (w.ex ?? []).forEach((e, at) => {
      const de = isStr(e?.de) ? e.de : '', en = isStr(e?.en) ? e.en : '';
      const where = `ex[${at}]`;
      if (de.includes('\n') || en.includes('\n')) {
        // "Unser täglich Brot gib uns heute\nGive us today our daily bread"
        errors.push({ id, msg: `${where} splices German and English with a newline` });
      }
      if (en && de.trim().toLowerCase().endsWith(en.trim().toLowerCase()) && de.trim().length > en.trim().length) {
        errors.push({ id, msg: `${where} German field ends with its own translation` });
      }
      if (/please add an English translation/i.test(de) || /please add an English translation/i.test(en)) {
        errors.push({ id, msg: `${where} carries Wiktionary's untranslated-quotation placeholder` });
      }
      if (/^\s*(c\.\s*)?\d{3,4}\s*[,;]/.test(de)) {
        // "1812, the Brothers Grimm, Kinder- und Haus-Märchen, …, page VIII"
        errors.push({ id, msg: `${where} German field is a bibliography line` });
      }
      // Length is a judgement call, not corruption: a 300-char B2 sentence is poor
      // for a flashcard but it is still correct German. Warning, so --strict gates
      // new batches while the existing long rows are worked through.
      if (de.length > 160) warnings.push({ id, msg: `${where} is ${de.length} chars (long for a card)` });
      if (!en.trim() && de.trim()) warnings.push({ id, msg: `${where} has no translation` });
      // One shared rule with corpus:examples (lib.ts). This used to be a second,
      // subtly different copy that was missing the trailing word boundary, so it
      // reported "Thunfisch" — tuna — as 19th-century spelling.
      if (ARCHAIC_SPELLING.test(de)) warnings.push({ id, msg: `${where} uses pre-1996 orthography` });
      if (/\[(?:…|\.\.\.)\]/.test(de)) warnings.push({ id, msg: `${where} contains an elided passage` });
    });
    if (w.gender != null && !['der', 'die', 'das'].includes(w.gender)) errors.push({ id, msg: `bad gender ${w.gender}` });
    if (w.kind === 'word' && w.pos === 'noun' && !w.gender) warnings.push({ id, msg: 'noun without gender' });
    if (w.kind === 'word' && w.pos === 'noun' && !w.plural) warnings.push({ id, msg: 'noun without plural' });
    if (w.kind === 'word' && !w.ipa) warnings.push({ id, msg: 'no ipa' });
    // An example-less card is a bare gloss, so it fails outright; one example is
    // a thin connection between word and use, so it only warns.
    if (w.kind === 'word' && (!w.ex || !w.ex.length)) errors.push({ id, msg: 'no example' });
    else if (w.kind === 'word' && w.ex.length < 2) warnings.push({ id, msg: 'fewer than two examples' });
    // Miscapitalised headwords are caught in dupeCheck, where the lowercase-twin
    // set already exists to tell a duplicate from a lone miscapitalisation.
    if (w.kind === 'word' && w.pos && !ALLOWED_POS.has(w.pos)) warnings.push({ id, msg: `pos "${w.pos}" outside new-card set` });
    // Definition quality (corpus:definitions owns the full audit; these two are
    // the classes that have been cleared to zero and must stay there).
    //
    // A German definition in the English field is a hard error: all 367 moved to
    // `defDe`, so a new one means an import path is writing to the wrong column
    // again — the bug, not the content, since German definitions are now a shown
    // feature at B2+.
    // The mirror defect: English in the *German* field. `defDe` is shown to B2+
    // learners as the monolingual layer, so an English gloss list there is not a
    // tidiness question — it is the one thing that layer exists not to be.
    if (w.kind === 'word' && w.defDe && isEnglishInGermanField(w.defDe)) {
      errors.push({ id, msg: 'English prose in the German `defDe` field' });
    }
    if (w.kind === 'word' && w.def) {
      if (isGermanDefinition(w.def, w.en ?? '')) {
        errors.push({ id, msg: 'German definition in the English `def` field — belongs in `defDe`' });
      }
      // A definition that just repeats the gloss it sits next to teaches nothing.
      if (w.def.trim().toLowerCase().replace(/[.;,]/g, '') === (w.en ?? '').trim().toLowerCase().replace(/[.;,]/g, '')) {
        warnings.push({ id, msg: 'def only repeats the en gloss' });
      }
    }
  }
  return { errors, warnings };
}

function dupeCheck(cards: Word[]): { errors: Issue[]; warnings: Issue[] } {
  const errors: Issue[] = [], warnings: Issue[] = [];
  const byId = new Map<string, number>();
  const byLevelTerm = new Map<string, string>();
  const byTerm = new Map<string, string>();
  const byLevelLemma = new Map<string, string>();
  for (const w of cards) {
    byId.set(w.id, (byId.get(w.id) ?? 0) + 1);
    if (w.kind !== 'word') continue;
    const kt = `${w.level} ${w.term.toLowerCase()}`;
    if (byLevelTerm.has(kt)) errors.push({ id: w.id, msg: `duplicate (level, term) with ${byLevelTerm.get(kt)}` });
    else byLevelTerm.set(kt, w.id);

    // The same term at *different* levels — the defect BACKLOG Now #3 existed to
    // remove (874 terms on 1,021 redundant cards; the learner meets `die Mutter`
    // at A1 and re-learns it at B1 under a second FSRS schedule). The check above
    // is keyed on level, so it could never see it, and nothing else enforced the
    // zero that pass ended on. It went unnoticed until the 2026-08-14 gender fix
    // renamed `die Visum` to `das Visum` and silently collided with the B1 card:
    // `corpus:validate` returned PASS on a corpus with a duplicate in it.
    //
    // The article is part of the term, so `der See` / `die See` are two terms and
    // do not collide here — the same property `merge-dupes.ts` relies on.
    const kg = w.term.toLowerCase();
    if (byTerm.has(kg)) errors.push({ id: w.id, msg: `same term as ${byTerm.get(kg)} at another level — merge with corpus:dupes` });
    else byTerm.set(kg, w.id);
    const kl = `${w.level} ${lemmaKey(w.term)}`;
    if (byLevelLemma.has(kl)) warnings.push({ id: w.id, msg: `near-duplicate lemma with ${byLevelLemma.get(kl)}` });
    else byLevelLemma.set(kl, w.id);
  }
  for (const [id, n] of byId) if (n > 1) errors.push({ id, msg: `duplicate id ×${n}` });

  // German capitalises nouns and nothing else, so a single-word headword that is
  // capitalised and *isn't* a noun is a miscapitalisation — and where a lowercase
  // twin exists it is a duplicate card too, splitting FSRS progress for one word
  // across two ids. Found by the reading index, which resolved "Haben Sie …?" to a
  // capitalised copy of `haben`. Multi-word phrases are exempt: "Wie bitte?" and
  // "Rad fahren" are correctly capitalised as citation forms.
  // Severity splits on whether the fix is mechanical. For adjectives, verbs and
  // adverbs it is: scripts/corpus/casefix.ts cleared all 91 of them, so a new one
  // is a regression and fails the build. The rest — pronouns, particles,
  // determiners — need a human, because capitalisation there can be *correct*
  // (polite "Ihr", nominalised "das Ja"), so they stay warnings until someone
  // rules on them one by one.
  // A card ruled `keep` in case-rulings.tsv is capitalised on purpose and carries
  // its reason there ("Verzeihung!" is the noun used as an exclamation). Reading
  // the rulings here is what lets this list reach zero and stay actionable —
  // a warning nobody can ever clear is one everybody learns to scroll past.
  const MECHANICAL = new Set(['adjective', 'verb', 'adverb']);
  const lowercaseTwin = new Set(
    cards.filter((w) => w.kind === 'word').map((w) => w.term));
  for (const w of cards) {
    if (w.kind !== 'word' || w.pos === 'noun' || w.pos === 'phrase') continue;
    if (RULED_CAPITAL.has(w.id)) continue;
    if (w.term.includes(' ') || !/^\p{Lu}/u.test(w.term)) continue;
    const twin = w.term.toLowerCase();
    const msg = lowercaseTwin.has(twin)
      ? `capitalised duplicate of "${twin}" — German capitalises only nouns`
      : `capitalised non-noun headword (${w.pos || 'no pos'})`;
    (MECHANICAL.has(w.pos) ? errors : warnings).push({
      id: w.id,
      msg: MECHANICAL.has(w.pos) ? `${msg} — run corpus:casefix` : msg,
    });
  }

  // A card whose **surface form** another card already claims. The check above is
  // keyed on the term string, so it cannot see `die Schuhe` beside `der Schuh` —
  // two terms, two cards, one word, and `buildMatcher` indexes surface forms
  // first-wins so one of them silently claims *Schuhe* for both. That is how a
  // card's own example comes to resolve to a different card.
  //
  // Every pair is ruled in form-rulings.ts, merged or kept, and both `merge-forms`
  // and this check read the same table — so the list can reach zero and stay
  // actionable. Only a pair ruled **keep** is allowed to survive: an unruled pair
  // is a judgement nobody has made, and a pair ruled `merge` that is still here
  // means the pass was never run. Both fail the build, for the reason the 2026-08-14
  // Visum duplicate did not: an invariant that lives only in a sentence somewhere
  // is not enforced.
  const ruled = new Map(FORM_RULINGS.map((r) => [pairKey(r.form, r.lemma), r.rule]));
  for (const c of findFormCollisions(cards)) {
    const rule = ruled.get(pairKey(c.form.id, c.lemma.id));
    if (rule === 'keep') continue;
    errors.push({
      id: c.form.id,
      msg: rule === 'merge'
        ? `ruled to merge into ${c.lemma.id} and still here — run corpus:forms -- --write`
        : `headword is a form of ${c.lemma.id} ("${c.lemma.term}", pl. ${c.lemma.plural ?? '—'}) — rule it in form-rulings.ts, then run corpus:forms`,
    });
  }
  return { errors, warnings };
}

async function probe(matcher: Matcher, full: Word[]) {
  const words = full.filter((w) => w.kind === 'word');

  // One seed per class, not one stream for all three.
  //
  // `sample` is a full Fisher–Yates shuffle, so it draws `population - 1` values.
  // With a single shared `rng` the three samples were chained: verbs, then nouns,
  // then adjectives. Any change to an *upstream* population shifted the stream
  // position for everything after it, so a corpus edit that touched only nouns
  // silently re-rolled which 200 adjectives got tested.
  //
  // Caught 2026-08-21 expanding 208 shorthand plurals into full `die …` forms. The
  // plural population grew 2,801 → 3,009, consuming 208 extra draws, and the
  // adjective rate "moved" 0.955 → 0.945 without a single adjective card changing.
  // The reverse is the dangerous direction: a real regression hidden by a lucky
  // re-roll. Separate seeds make each class's sample stable unless that class's own
  // population changes, which is the only thing that should move its number.
  const seeds = { verb: 99, noun: 4519, adj: 7717 };

  const run = (cards: Word[], form: (w: Word) => string | null) => {
    let n = 0, hit = 0;
    for (const w of cards) {
      const f = form(w);
      if (!f) continue;
      n++;
      const seg = matcher.annotate(f)[0];
      if (seg?.word?.id === w.id) hit++;
    }
    return { n, hit, rate: n ? +(hit / n).toFixed(3) : 1 };
  };

  const verbs = sample(words.filter((w) => w.pos === 'verb'), 200, mulberry32(seeds.verb));
  const verbRes = run(verbs, (w) => {
    const inf = stripArticle(w.term);
    if (!canConjugate(inf)) return null;
    // Participle (ge-…): distinctive, so fewer false collisions than the -t er-form
    // (which clashes with nouns like macht/die Macht). Misses are mostly strong-verb
    // participles that are also adjectives (gelassen = "calm") — expected, not a bug.
    try { return conjugate(inf).partizip; } catch { return null; }
  });
  // Only probe real plural forms ("die Spiele"), not the placeholder notes some
  // existing cards carry ("nur Singular"/"nur Plural").
  const nouns = sample(words.filter((w) => w.pos === 'noun' && w.plural && /^die\s/i.test(w.plural)), 200, mulberry32(seeds.noun));
  const nounRes = run(nouns, (w) => stripArticle(w.plural!));
  const adjs = sample(words.filter((w) => w.pos === 'adjective'), 200, mulberry32(seeds.adj));
  const adjRes = run(adjs, (w) => stripArticle(w.term).toLowerCase() + 'e');

  // Closed-class inflections should resolve to their lemma card (EXTRA_CLOSED_FORMS).
  const closedCases: [string, string][] = [['diese', 'Dieser'], ['diesem', 'Dieser'], ['worden', 'werden'], ['meiner', 'Mein']];
  const byTerm = new Map(words.map((w) => [w.term, w]));
  let cN = 0, cHit = 0;
  for (const [form, lemmaTerm] of closedCases) {
    if (!byTerm.has(lemmaTerm)) continue; // only check paradigms whose lemma card exists
    cN++;
    if (matcher.annotate(form)[0]?.word?.term === lemmaTerm) cHit++;
  }
  const closedRes = { n: cN, hit: cHit, rate: cN ? +(cHit / cN).toFixed(3) : 1 };

  return { verbRes, nounRes, adjRes, closedRes };
}

async function main() {
  const full = loadCorpus(PATHS.vocab);
  const sectors = loadSectors(PATHS.sectors);
  const words = full.filter((w) => w.kind === 'word');

  const matcher = primeApp(full);
  const schema = schemaCheck(full);
  const dupe = dupeCheck(full);
  const allErrors = [...schema.errors, ...dupe.errors];
  const warnings = [...schema.warnings, ...dupe.warnings];

  // Distributions.
  const byLevel: Record<string, number> = {};
  for (const w of words) byLevel[w.level] = (byLevel[w.level] ?? 0) + 1;
  const byGroup: Record<string, number> = {};
  const groupOf = new Map(sectors.map((s) => [s.name, s.group]));
  for (const w of words) { const g = groupOf.get(w.field) ?? '(unknown)'; byGroup[g] = (byGroup[g] ?? 0) + 1; }

  // Presence rates.
  const nouns = words.filter((w) => w.pos === 'noun');
  const rate = (n: number, d: number) => (d ? (100 * n / d).toFixed(1) : '—') + '%';
  const ipaRate = rate(words.filter((w) => w.ipa).length, words.length);
  const exRate = rate(words.filter((w) => w.ex?.length).length, words.length);
  const plRate = rate(nouns.filter((w) => w.plural).length, nouns.length);

  // Reader-matching probe.
  const { verbRes, nounRes, adjRes, closedRes } = await probe(matcher, full);
  // Regression FLOORS, not quality targets. The reader resolves an inflected form
  // to whatever lemma owns it, so legitimate homographs (plural "Morgen" → adverb
  // "morgen") count as probe misses even though matching is correct. Baselines on
  // the seeded sample sit near verb 0.79 · plural 0.84 · adj 0.80; a real
  // regression (broken conjugation/plural indexing) would fall far below these.
  const T = { verb: 0.62, noun: 0.72, adj: 0.70 };
  const probeFail =
    (verbRes.n && verbRes.rate < T.verb) || (nounRes.n && nounRes.rate < T.noun) ||
    (adjRes.n && adjRes.rate < T.adj) || (closedRes.n > 0 && closedRes.hit < closedRes.n);

  // A rule long enough to need structure must have it. 127 of 128 rules shipped as
  // single unbroken paragraphs — up to 547 characters — into a RuleCard that has
  // rendered `whitespace-pre-line` the whole time, waiting for newlines that never
  // came. The sections are authored now; this is what stops the next batch
  // regressing to a wall of prose nobody reads on a phone.
  const RULE_PROSE_MAX = 280;
  // Deliberately not wrapped in a catch: the first version was, and it swallowed a
  // missing import so the gate silently passed while reporting PASS — a check that
  // cannot fail is worse than no check, because it is trusted.
  const bank = readJSON<Record<string, { title: string; rule?: string; sections?: unknown[] }[]>>(
    join(PATHS.repoRoot, 'public', 'data', 'grammar.json'));
  for (const [lv, points] of Object.entries(bank)) {
    for (const p of points) {
      const len = (p.rule ?? '').length;
      if (len > RULE_PROSE_MAX && !p.sections?.length) {
        allErrors.push({ id: `gram:${lv}:${p.title}`, msg: `rule is ${len} chars with no sections (max ${RULE_PROSE_MAX} as prose)` });
      }
    }
  }

  // A noun filed in a sector reserved for another part of speech. This is the
  // signal that would have caught `der Somit` — a card glossed "somite" with a
  // gender and a plural, sitting in **Adverbs**, whose examples were the adverb
  // *somit* all along. It went unnoticed for as long as it did because every field
  // was individually plausible; only the sector disagreed with the part of speech.
  //
  // ⚠️ The obvious wider check does not work, and was measured before this one was
  // written: "the sector is a part-of-speech sector that disagrees with `pos`"
  // fires on **65 cards, of which ~64 are correct** — `die Zahl` is a noun in
  // *Numbers*, `doch` a particle in *Adverbs*, and 44 phrases sit in *Useful
  // Phrases* exactly where they belong. Narrowed to nouns in the four sectors that
  // are reserved for other parts of speech, it finds the two real ones and nothing
  // else. *Numbers is deliberately not in the list*: it holds `die Zahl` on purpose.
  // A noun card whose example only proves itself through a **lowercase** token.
  //
  // German capitalises every noun, so a lowercase match is the homograph and not
  // the headword: `die Braut` illustrated with «Er braut Bier», `der Schritt` with
  // «Wer schritt ein?», `die Naht` with «Das Ende naht!». All three shipped, and
  // all three satisfied the authoring gate, because the matcher indexes lowercased
  // surface forms — correct for reading, wrong as evidence. 49 of these existed
  // when the check was written and every one was hand-read; see CHANGELOG
  // 2026-08-24. `LOWERCASE_NOUN_OK` in lib.ts is the door for the lexicalised
  // exceptions (*schuld sein*), and is empty because the corpus had none.
  //
  // The mirror check on verbs and adjectives is deliberately absent — «beim
  // Tanzen» is ordinary German. The reasoning is in lib.ts beside the rule.
  for (const w of words) {
    if (w.pos !== 'noun') continue;
    for (const [i, e] of (w.ex ?? []).entries()) {
      if (!e?.de?.trim()) continue;
      const ev = headwordEvidence(matcher, w, e.de);
      if (!ev.ok && ev.why === 'miscased') {
        allErrors.push({ id: w.id, msg: `ex[${i}] proves the noun with the lowercase «${ev.token}» — that is the homograph, not the headword` });
      }
    }
  }

  const NON_NOUN_SECTORS = new Set(['Core verbs', 'Adverbs', 'Adjectives', 'Connectors']);
  for (const w of words) {
    if (w.pos === 'noun' && NON_NOUN_SECTORS.has(w.field)) {
      allErrors.push({ id: w.id, msg: `a noun filed in "${w.field}", a sector for another part of speech — check the card is really a noun, then re-sector it (corpus:cardfix)` });
    }
  }

  // freq.json is the **fourth** file that holds a card id, and until 2026-08-15 no
  // migration pass said so. LESSONS' own checklist named three — vocab, provenance
  // and the id map — so every relevel and merge since `corpus:freq` shipped left
  // ranks pointing at retired ids. Measured when this check was written: **47 of
  // 1,986 keys** were dead, which is 47 cards silently demoted to "unranked" in the
  // frequency-within-band ordering that BACKLOG Now #2 Phase 0 exists to provide.
  // It fails nothing and shows nothing, which is why it needed a check rather than
  // a note. Fix: `npm run corpus:freq`, which re-derives it from provenance.
  const freqPath = join(PATHS.repoRoot, 'public', 'data', 'freq.json');
  if (fileExists(freqPath)) {
    const live = new Set(full.map((w) => w.id));
    const dead = Object.keys(readJSON<Record<string, number>>(freqPath)).filter((id) => !live.has(id));
    if (dead.length) {
      allErrors.push({ id: 'freq.json', msg: `${dead.length} rank(s) on cards that no longer exist (${dead.slice(0, 3).join(', ')}…) — run corpus:freq` });
    }
  }

  // Size / perf.
  const raw = readFileSync(PATHS.vocab);
  const gz = gzipSync(raw);

  // Report.
  console.log(`\n=== Lexi corpus validation ===`);
  console.log(`Cards: ${full.length} (words ${words.length}, grammar ${full.length - words.length})`);
  console.log(`Level: ${LEVELS.map((l) => `${l} ${byLevel[l] ?? 0}`).join(' · ')}`);
  console.log(`Groups: ${Object.entries(byGroup).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(' · ')}`);
  console.log(`Presence — IPA ${ipaRate} · example ${exRate} · noun plural ${plRate}`);
  console.log(`Errors: ${allErrors.length} · Warnings: ${warnings.length}`);
  if (allErrors.length) for (const e of allErrors.slice(0, 20)) console.log(`  ERROR ${e.id}: ${e.msg}`);
  const warnCounts: Record<string, number> = {};
  for (const w of warnings) warnCounts[w.msg] = (warnCounts[w.msg] ?? 0) + 1;
  for (const [m, n] of Object.entries(warnCounts).sort((a, b) => b[1] - a[1])) console.log(`  warn ${m}: ${n}`);
  console.log(`Reader probe — verb ${verbRes.hit}/${verbRes.n} (${verbRes.rate}) · plural ${nounRes.hit}/${nounRes.n} (${nounRes.rate}) · adj ${adjRes.hit}/${adjRes.n} (${adjRes.rate}) · closed-class ${closedRes.hit}/${closedRes.n}`);
  console.log(`vocab.json ${(raw.length / 1e6).toFixed(2)} MB → gzip ${(gz.length / 1e6).toFixed(2)} MB`);

  // Random spot-check sample.
  const n = parseInt(argOpt('sample') ?? '10', 10);
  const seed = parseInt(argOpt('seed') ?? '42', 10);
  console.log(`\n--- random ${n}-card spot-check (seed ${seed}) — verify gender/plural/level ---`);
  for (const w of sample(words, n, mulberry32(seed))) {
    console.log(`  [${w.level}] ${w.term}${w.plural ? ` (pl. ${w.plural})` : ''} — ${w.en}${w.ipa ? ` /${w.ipa}/` : ''}  «${w.ex?.[0]?.de ?? '—'}»`);
  }

  const strict = process.argv.includes('--strict');
  const fail = allErrors.length > 0 || probeFail || (strict && warnings.length > 0);
  console.log(`\n${fail ? 'FAIL' : 'PASS'}${probeFail ? ' (reader probe below threshold)' : ''}`);
  process.exit(fail ? 1 : 0);
}

function argOpt(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.split('=')[1] : undefined;
}

main().catch((e) => { console.error(e); process.exit(1); });

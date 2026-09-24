// How far is the corpus from the news? The instrument behind the 2026-09-24
// CHANGELOG entry, committed so the numbers can be re-derived (LESSONS: a finding
// without its instrument has an expiry date).
//
//   npm run corpus:news              the Leipzig *news* list, offline and reproducible:
//                                    token-weighted coverage of the top 1k/3k/5k/10k
//                                    content forms, and the commonest misses.
//   npm run corpus:news -- --live    also fetches today's Tagesschau articles (5 per
//                                    ressort, 30 requests — half the API's hourly
//                                    allowance) and reports coverage for a learner
//                                    who knows every card up to each level. Nothing
//                                    fetched is written to disk: the API's terms allow
//                                    private use and forbid republishing.
//
// Uses the app's own matcher, so "covered" means what the meter means.
import './shim.ts';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, SOURCES } from './config.ts';
import { loadCorpus } from './lib.ts';
import { buildMatcher, isNeutralWord, isLikelyEntity } from '../../src/lib/matcher.ts';
import { parseTagesschauList, parseTagesschauDetail } from '../../src/lib/news/parse.ts';

const corpus = loadCorpus(PATHS.vocab).filter((w) => w.kind === 'word');
const m = buildMatcher(corpus);
const pct = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) : '0.0');

function leipzig() {
  const file = join(PATHS.raw, SOURCES.frequency.file);
  if (!existsSync(file)) { console.log(`(no Leipzig list at ${file} — run corpus:fetch)`); return; }
  const rows = readFileSync(file, 'utf8').split('\n').map((l) => l.split('\t'))
    .filter((p) => p.length === 3 && /^\p{L}[\p{L}-]*$/u.test(p[1]) && p[1].length >= 3)
    .map((p) => ({ w: p[1], f: Number(p[2]) }));
  console.log('Leipzig news list — token-weighted coverage of content forms');
  for (const n of [1000, 3000, 5000, 10000]) {
    let tot = 0, hit = 0, cap = 0, low = 0;
    const lowMiss: string[] = [];
    for (const r of rows.slice(0, n)) {
      if (isNeutralWord(r.w) || isLikelyEntity(r.w)) continue;
      tot += r.f;
      if (m.annotate(r.w)[0]?.word) hit += r.f;
      else if (/^\p{Lu}/u.test(r.w)) cap += r.f;
      else { low += r.f; lowMiss.push(r.w); }
    }
    console.log(`  top ${String(n).padStart(5)}: ${pct(hit, tot)}% resolved · ${pct(cap, tot)}% capitalised misses (names and nouns) · ${pct(low, tot)}% lowercase misses`);
    if (n === 3000) console.log(`    commonest lowercase misses: ${lowMiss.slice(0, 40).join(' ')}`);
  }
}

async function live() {
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const texts: { ressort: string; title: string; text: string }[] = [];
  for (const ressort of ['wirtschaft', 'inland', 'ausland', 'wissen', 'sport']) {
    const list = parseTagesschauList(await (await fetch(`https://www.tagesschau.de/api2u/news/?ressort=${ressort}`)).json());
    for (const a of list.slice(0, 5)) {
      const paras = parseTagesschauDetail(await (await fetch(a.detail!)).json());
      texts.push({ ressort, title: a.title, text: paras.map((p) => p.text).join('\n') });
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  console.log(`\nToday's Tagesschau — ${texts.length} articles, learner knows every card up to…`);
  for (const upTo of ['A2', 'B1', 'B2', 'C2']) {
    const lv = new Set(LEVELS.slice(0, LEVELS.indexOf(upTo) + 1));
    let sum = 0, absentSum = 0, over90 = 0;
    for (const t of texts) {
      let counted = 0, known = 0, absent = 0;
      for (const s of m.annotate(t.text)) {
        if (!s.isWord || isNeutralWord(s.text) || isLikelyEntity(s.text) || /^\d/.test(s.text) || s.text.length < 3) continue;
        counted++;
        if (!s.word) absent++;
        else if (lv.has(s.word.level)) known++;
      }
      const r = counted ? known / counted : 0;
      sum += r; absentSum += counted ? absent / counted : 0;
      if (r >= 0.9) over90++;
    }
    console.log(`  ${upTo}: mean ${(100 * sum / texts.length).toFixed(1)}% · ${over90}/${texts.length} articles ≥ 90% · not in corpus ${(100 * absentSum / texts.length).toFixed(1)}%`);
  }
  console.log('  (names are counted here, as the corpus scripts always have; the app excludes those de.wiktionary confirms)');
}

leipzig();
if (process.argv.includes('--live')) await live();

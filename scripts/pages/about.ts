// The about page: Lexi, and Gans, for a stranger (`/about`, design/mascot/README.md).
//
//   node scripts/pages/about.ts [dist]        (run by `npm run build`, after Vite)
//
// **What it is.** One static page outside the app, like `legal.html` and the word
// pages: it has to open without the bundle, from a link anywhere, and it must not
// depend on the thing it describes. Its theme is the user's line, *language is always
// in dialogue with itself*, and every section is one of the ways English and German
// talk: shared words, built words, a verb that splits, a friend that lies.
//
// **Every German word on it is a card, and the build proves it.** The page is
// written from the shipped data — `cards.json`, `detail/`, `transfer.json`, the
// dictionary shards and `FALSE_FRIENDS` — and `loadFacts` throws when a word, an
// example sentence, a compound's parts or a cognate it names is not there. A word
// that is only a dictionary entry (Gans herself) is drawn in the entry's dashed
// chrome and says so, the same line the app holds (VISION, *Two layers*). The
// counts are read, not typed. The only hand-written things are the explanation and
// the English literal readings (*hand-shoe*), and each literal must use a sense the
// part's own card gives.
//
// **It cannot touch a learner.** No store, no IndexedDB, no exposure, no grade: the
// script (`about.js`) only animates and honks.
import { readFileSync, readdirSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gans, footprints } from './gans.ts';
import { FALSE_FRIENDS } from '../../src/lib/falseFriends.ts';
import { countTaught, roundedDown, PUBLIC_ORIGIN } from '../../src/lib/publicCopy.ts';
import { slug } from '../../src/lib/slug.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const REPO = 'https://github.com/shamilhzm/lexi';

// ── What the page shows. Hand-picked; every row is verified in loadFacts. ─────────

/** [segment as written in the compound, the part's card, the sense used] */
type Part = [string, string, string];
const COMPOUNDS: { whole: string; parts: Part[] }[] = [
  { whole: 'der Handschuh', parts: [['Hand', 'die Hand', 'hand'], ['schuh', 'der Schuh', 'shoe']] },
  { whole: 'der Kühlschrank', parts: [['Kühl', 'kühl', 'cool'], ['schrank', 'der Schrank', 'cupboard']] },
  { whole: 'das Krankenhaus', parts: [['Kranken', 'krank', 'sick'], ['haus', 'das Haus', 'house']] },
  { whole: 'das Flugzeug', parts: [['Flug', 'der Flug', 'flight'], ['zeug', 'das Zeug', 'stuff']] },
  { whole: 'die Glühbirne', parts: [['Glüh', 'glühen', 'glow'], ['birne', 'die Birne', 'pear']] },
  { whole: 'der Regenschirm', parts: [['Regen', 'der Regen', 'rain'], ['schirm', 'der Schirm', 'screen']] },
  { whole: 'das Handtuch', parts: [['Hand', 'die Hand', 'hand'], ['tuch', 'das Tuch', 'cloth']] },
  { whole: 'die Erdbeere', parts: [['Erd', 'die Erde', 'earth'], ['beere', 'die Beere', 'berry']] },
  { whole: 'das Wörterbuch', parts: [['Wörter', 'das Wort', 'word'], ['buch', 'das Buch', 'book']] },
  { whole: 'das Feuerwerk', parts: [['Feuer', 'das Feuer', 'fire'], ['werk', 'das Werk', 'works']] },
];

/** A separable verb, and one of its own example sentences that splits it. */
const SPLITS = [
  { card: 'anrufen', sentence: 'Ich rufe dich morgen an.', verb: 'rufe', particle: 'an' },
  { card: 'aufstehen', sentence: 'Ich stehe um sieben auf.', verb: 'stehe', particle: 'auf' },
  { card: 'fernsehen', sentence: 'Abends sehe ich fern.', verb: 'sehe', particle: 'fern' },
  { card: 'einkaufen', sentence: 'Ich kaufe im Supermarkt ein.', verb: 'kaufe', particle: 'ein' },
];

const FRIENDS = ['gift', 'bekommen', 'rat', 'rock', 'handy', 'chef', 'kind', 'bald'];

/** English lost an n before f, s and th; German kept it. Each pair must be a shipped
 *  cognate in `transfer.json`, with this English word. */
const NASAL: [string, string][] = [['der Zahn', 'tooth'], ['der Mund', 'mouth'], ['fünf', 'five'], ['anderer', 'other']];

/** Dictionary entries, not cards: drawn in the entry's chrome. */
const GOOSE_ENTRIES = ['Gans', 'Gänsefüßchen', 'Gänsehaut', 'Gänseblümchen', 'Ganter'];

// ── The data ──────────────────────────────────────────────────────────────────────

interface Card { id: string; term: string; en: string; pos: string; level: string; gender?: string; plural?: string; kind?: string }
interface Example { de: string; en: string }
interface Entry { w: string; p: string; g: string[]; x?: string }
interface Rule { de: string; en: string; n: number; ex: [string, string][]; mark: [string, string] }
interface Transfer { rules: Record<string, Rule>; words: Record<string, (string | 0)[]> }

export interface Facts {
  words: number;
  dictionary: number;
  card: (term: string) => Card;
  examples: Record<string, Example[]>;
  entries: Map<string, Entry>;
  transfer: Transfer;
}

const ARTICLE = /^(der|die|das)\s+/;
const bareOf = (term: string) => term.replace(ARTICLE, '');
/** A gloss's senses, as a reader would list them: "to glow" → "glow". */
const senses = (en: string) => en.split(/[,;/]/).map((s) => s.trim().replace(/^to /, '')).filter(Boolean);
const firstSense = (en: string) => en.split(/[,;]/)[0].trim();

export function loadFacts(dataDir = join(ROOT, 'public', 'data')): Facts {
  const read = (p: string) => JSON.parse(readFileSync(join(dataDir, p), 'utf8'));
  const cards = read('cards.json') as Card[];
  const byTerm = new Map(cards.filter((c) => c.kind === 'word').map((c) => [c.term, c]));
  const card = (term: string) => {
    const c = byTerm.get(term);
    if (!c) throw new Error(`about: "${term}" is not a card in cards.json`);
    return c;
  };
  const examples: Record<string, Example[]> = {};
  for (const f of readdirSync(join(dataDir, 'detail'))) {
    for (const [id, d] of Object.entries(JSON.parse(readFileSync(join(dataDir, 'detail', f), 'utf8')) as Record<string, { ex?: Example[] }>)) {
      if (d.ex) examples[id] = d.ex;
    }
  }
  // The dictionary is 225 shards; read until every entry the page names is found.
  const entries = new Map<string, Entry>();
  const want = new Set(GOOSE_ENTRIES);
  for (const f of readdirSync(join(dataDir, 'lex')).filter((f) => /^\d+\.json$/.test(f))) {
    for (const e of (read(join('lex', f)) as { e: Entry[] }).e) if (want.has(e.w) && !entries.has(e.w)) entries.set(e.w, e);
    if (entries.size === want.size) break;
  }
  for (const w of want) if (!entries.has(w)) throw new Error(`about: "${w}" is not in the dictionary`);
  const facts: Facts = {
    words: countTaught(cards),
    dictionary: Number(read('lex/index.json').n),
    card, examples, entries,
    transfer: read('transfer.json') as Transfer,
  };
  verify(facts);
  return facts;
}

/** Everything the page claims, checked against the data. Throws on the first lie. */
export function verify(f: Facts) {
  for (const { whole, parts } of COMPOUNDS) {
    const w = bareOf(f.card(whole).term);
    const joined = parts.map(([seg]) => seg).join('');
    if (joined.toLowerCase() !== w.toLowerCase()) throw new Error(`about: ${parts.map((p) => p[0]).join('+')} does not spell ${w}`);
    for (const [seg, term, sense] of parts) {
      const c = f.card(term);
      const b = bareOf(c.term).toLowerCase(), s = seg.toLowerCase();
      const plural = c.plural ? bareOf(c.plural).toLowerCase() : '';
      if (!(s.startsWith(b) || b.startsWith(s) || s === plural)) throw new Error(`about: "${seg}" in ${w} is not a form of ${c.term}`);
      if (!senses(c.en).includes(sense)) throw new Error(`about: "${sense}" is not a sense of ${c.term} (${c.en})`);
    }
  }
  for (const s of SPLITS) {
    const c = f.card(s.card);
    if (!(f.examples[c.id] ?? []).some((e) => e.de === s.sentence)) throw new Error(`about: "${s.sentence}" is not an example of ${c.term}`);
    const tokens = s.sentence.replace(/[.!?]$/, '').split(' ');
    if (tokens.at(-1) !== s.particle || !tokens.includes(s.verb)) throw new Error(`about: "${s.sentence}" does not split ${c.term}`);
    if (!c.term.startsWith(s.particle) || !c.term.slice(s.particle.length).startsWith(s.verb.replace(/e$/, ''))) throw new Error(`about: ${s.particle} + ${s.verb} is not ${c.term}`);
  }
  for (const k of FRIENDS) {
    if (!FALSE_FRIENDS[k]) throw new Error(`about: no false friend "${k}"`);
    friendCard(f, k);
  }
  for (const [de, en] of NASAL) {
    const row = f.transfer.words[f.card(de).term];
    if (!row || row[0] !== 'c' || row[1] !== en) throw new Error(`about: transfer.json does not relate ${de} to ${en}`);
  }
}

const friendCard = (f: Facts, key: string) => {
  for (const t of [key, `der ${cap(key)}`, `die ${cap(key)}`, `das ${cap(key)}`]) {
    try { return f.card(t); } catch { /* next */ }
  }
  throw new Error(`about: false friend "${key}" is not a card`);
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// ── Rendering ─────────────────────────────────────────────────────────────────────

const esc = (s: string | number = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wort = (term: string) => `wort/${encodeURIComponent(slug(term))}`;

/** The German word with its article in gender ink, as the word pages draw it. */
function term(c: Card): string {
  const m = c.term.match(ARTICLE);
  return m ? `<span class="art g-${m[1]}">${m[1]}</span> ${esc(c.term.slice(m[0].length))}` : esc(c.term);
}

/** Wrap the first match of a mark in a highlighter. */
function mark(word: string, source: string, side: 'de' | 'en', flags = ''): string {
  let re: RegExp;
  try { re = new RegExp(source, flags); } catch { return esc(word); }
  const m = re.exec(word);
  if (!m || !m[0]) return esc(word);
  return `${esc(word.slice(0, m.index))}<mark class="${side}">${esc(m[0])}</mark>${esc(word.slice(m.index + m[0].length))}`;
}

function sectionHead(n: string, kicker: string, en: string, de: string, id: string): string {
  return `<header class="sec-h"><p class="kicker">${n} · ${esc(kicker)}</p>` +
    `<h2 id="${id}"><span class="h-en">${esc(en)}</span><span class="h-de" lang="de"><span class="q" aria-hidden="true">„</span>${esc(de)}<span class="q" aria-hidden="true">“</span></span></h2></header>`;
}

/** A row of footprints between two sections: Gans walked through here. */
function trail(): string {
  const steps = [0, 1, 2, 3, 4, 5].map((i) =>
    `<span class="step" style="--i:${i}">${footprints({ closing: i % 2 === 1 })}</span>`).join('');
  return `<div class="trail" aria-hidden="true">${steps}</div>`;
}

function entryCard(e: Entry, note: string, literal?: string): string {
  const art = e.x ? `<span class="art g-${esc(e.x)}">${esc(e.x)}</span> ` : '';
  const gloss = e.g[0].replace(/\s*\(.*$/, '');
  return `<li class="entry"><p class="entry-tag">Dictionary entry · unchecked</p>` +
    `<p class="entry-w" lang="de">${art}${esc(e.w)}</p><p class="entry-g">${esc(gloss)}</p>` +
    (literal ? `<p class="entry-lit">literally <i>${esc(literal)}</i></p>` : '') +
    `<p class="entry-note">${note}</p></li>`;
}

export function renderAbout(f: Facts, opts: { fonts?: { fraunces?: string; mono400?: string; mono700?: string }; origin?: string } = {}): string {
  const words = roundedDown(f.words);
  const dictionary = roundedDown(f.dictionary);
  const origin = (opts.origin ?? PUBLIC_ORIGIN).replace(/\/+$/, '');
  const rules = Object.entries(f.transfer.rules).sort((a, b) => b[1].n - a[1].n);
  const kinds = { b: 0, c: 0, h: 0 } as Record<string, number>;
  for (const row of Object.values(f.transfer.words)) kinds[row[0] as string] = (kinds[row[0] as string] ?? 0) + 1;
  const related = kinds.c + kinds.h;
  const linked = related + kinds.b;
  const minN = Math.min(...rules.map(([, r]) => r.n));

  // What Gans says when pressed: hallo, then one pair from every counted pattern.
  const lines: [string, string][] = [[f.card('hallo').term, firstSense(f.card('hallo').en)], ...rules.map(([, r]) => r.ex[0])];

  const g = (k: string) => f.entries.get(k)!;
  const buch = f.card('das Buch');
  const fonts = opts.fonts ?? {};
  const face = (family: string, file: string | undefined, weight: string, fmt = 'woff2') =>
    file ? `@font-face{font-family:"${family}";src:url("assets/${file}") format("${fmt}");font-weight:${weight};font-display:swap}` : '';

  const hero = `
<section class="hero" aria-labelledby="h1">
  <div class="hero-text">
    <p class="kicker">Lexi · German for English speakers</p>
    <h1 id="h1"><span class="feet-open">${footprints({ cls: 'q-open' })}</span>Language is always in dialogue with&nbsp;itself.<span class="feet-close">${footprints({ closing: true, cls: 'q-close' })}</span></h1>
    <p class="reply" lang="de">Sprache ist immer im Gespräch mit sich selbst.</p>
    <p class="lede">English and German are two halves of one very old conversation. Lexi teaches German to English speakers by letting you listen in: <strong>${words}</strong> words you can study, every one machine-checked, and <strong>${dictionary}</strong> more you can look up.</p>
    <p class="ctas"><a class="key" href="./">Open Lexi</a><a class="ghost" href="#how">How it works</a></p>
    <p class="small">Free · open source · no account · nothing tracked</p>
  </div>
  <div class="hero-gans">
    <p class="bubble" id="bubble" aria-live="polite"><span lang="de">„Hallo!“</span></p>
    <button class="gans-btn" type="button" aria-describedby="bubble" aria-label="Gans the goose. Press her to hear her talk." data-lines="${esc(JSON.stringify(lines))}">${gans({ pose: 'stand', cls: 'big', talk: true })}</button>
  </div>
</section>`;

  const meet = `
<section class="sec" aria-labelledby="meet">
  ${sectionHead('01', 'Gans', 'Meet Gans', 'Das ist die Gans.', 'meet')}
  <p class="lead">Lexi’s mascot is a goose, for two reasons a linguist would sign.</p>
  <div class="two">
    <article class="why">
      <p class="kicker">Her feet</p>
      <p class="big-quote" lang="de"><span class="bq">${footprints()}</span>Hallo!<span class="bq hi">${footprints({ closing: true })}</span></p>
      <p>German calls quotation marks <b lang="de">Gänsefüßchen</b>: little goose feet. Every line of German dialogue is written between her footprints, one pair low to open and one pair high to close.</p>
    </article>
    <article class="why">
      <p class="kicker">Her name</p>
      <p class="pair-big"><span lang="en">goose</span> <span class="tilde" aria-hidden="true">·</span> <span lang="de">Ga<mark class="de">n</mark>s</span></p>
      <p>The same word. English lost its <i>n</i> before <i>f</i>, <i>s</i> and <i>th</i>; German kept it. You already know the pattern:</p>
      <ul class="pairs">${NASAL.map(([de, en]) => {
        const c = f.card(de);
        return `<li><span lang="en">${esc(en)}</span><a lang="de" href="${wort(c.term)}">${mark(bareOf(c.term), 'n', 'de')}</a></li>`;
      }).join('')}</ul>
    </article>
  </div>
  <ul class="entries">
    ${entryCard(g('Gänsehaut'), 'Both languages reached for the goose to name the same shiver.', 'goose skin')}
    ${entryCard(g('Gänseblümchen'), 'English has its own name for it. German kept the goose.', 'little goose flower')}
    ${entryCard(g('Ganter'), 'The same word again, with German t for English d, as in trinken · drink.')}
    ${entryCard(g('Gans'), 'Herself. She is an entry, not a card, and she would want you to know.')}
  </ul>
  <p class="aside">Note the dashed borders. These are <b>dictionary entries</b>: Wiktionary’s glosses, which Lexi shows but has not checked. A <b>card</b> is different. Its gender, plural and pronunciation were checked by machine before it shipped, and every example sentence on it contains the word. In Lexi the two never wear the same frame.</p>
</section>`;

  const shift = `
<section class="sec" aria-labelledby="shift">
  ${sectionHead('02', 'Cognates', 'Same word, two mouths', 'Ein Wort, zwei Münder.', 'shift')}
  <p class="lead">English and German grew from one language, and their consonants drifted apart in patterns. Lexi finds the patterns in its own cards: <strong>${related}</strong> of them are related to an English word, <strong>${kinds.b}</strong> were borrowed from English, and a pattern gets a name only when at least <strong>${minN}</strong> cards follow it.</p>
  <div class="machine">
    <button type="button" class="m-pause" aria-pressed="false" hidden>Pause</button>
    <p class="m-rule">German <span class="m-de" lang="de">${esc(rules[0][1].de)}</span> <span class="m-arrow" aria-hidden="true">⇄</span> English <span class="m-en">${esc(rules[0][1].en)}</span></p>
    <p class="m-words"><span class="m-w de" lang="de">${mark(rules[0][1].ex[0][0], rules[0][1].mark[0], 'de', 'i')}</span><span class="m-w en">${mark(rules[0][1].ex[0][1], rules[0][1].mark[1], 'en')}</span></p>
  </div>
  <ol class="rules">${rules.map(([id, r], i) => `
    <li class="rule">
      <button type="button" class="rule-btn" aria-pressed="${i === 0}" data-rule="${esc(id)}" data-de="${esc(r.de)}" data-en="${esc(r.en)}" data-mark="${esc(JSON.stringify(r.mark))}" data-ex="${esc(JSON.stringify(r.ex))}">
        <span class="r-pat"><span lang="de">${esc(r.de)}</span> · ${esc(r.en)}</span>
        <span class="r-n">${r.n} cards</span>
      </button>
      <ul class="r-ex">${r.ex.map(([de, en]) => `<li><a lang="de" href="${wort(de)}">${mark(de, r.mark[0], 'de', 'i')}</a> <span>${mark(en, r.mark[1], 'en')}</span></li>`).join('')}</ul>
    </li>`).join('')}
  </ol>
  <p class="aside">In all, ${linked} of Lexi’s cards say what they have to do with English, on the back of the card, never on the front, where it would give the answer away. Etymologies are English Wiktionary’s, and a link ships only when Wiktionary states it.</p>
</section>`;

  const compounds = `
<section class="sec" aria-labelledby="built">
  ${sectionHead('03', 'Compounds', 'Words made of words', 'Wörter aus Wörtern.', 'built')}
  <p class="lead">German makes a new word by letting two old ones talk. A glove is a hand-shoe. Tap one to hear the conversation.</p>
  <ul class="specimens">${COMPOUNDS.map(({ whole, parts }) => {
    const c = f.card(whole);
    const lit = parts.map((p) => p[2]).join('-');
    return `
    <li class="spec">
      <button type="button" class="spec-btn" aria-expanded="false">
        <span class="spec-w" lang="de">${term(c)}</span>
        <span class="spec-slot">
          <span class="spec-hint" aria-hidden="true">tap to split</span>
          <span class="spec-body">
            <span class="spec-parts" lang="de">${parts.map(([seg]) => `<span class="seg">${esc(seg)}</span>`).join('<span class="plus" aria-hidden="true">+</span>')}</span>
            <span class="spec-lit"><i>${esc(lit)}</i></span>
            <span class="spec-en">= ${esc(firstSense(c.en))}</span>
          </span>
        </span>
      </button>
    </li>`;
  }).join('')}
  </ul>
  <p class="aside">The last one is the two languages having the same conversation: <span lang="de">Feuerwerk</span>, <i>fireworks</i>. Every part above is a card of its own, and every literal reading uses a sense that card gives.</p>
</section>`;

  const splits = `
<section class="sec" aria-labelledby="split">
  ${sectionHead('04', 'Separable verbs', 'The verb that calls itself', 'Das Verb, das sich selbst anruft.', 'split')}
  <p class="lead">Some German verbs come apart in a sentence. The verb takes second place, and its first half waits at the very end, so the sentence answers itself in its last word.</p>
  <ul class="sents">${SPLITS.map((s) => {
    const c = f.card(s.card);
    const ex = f.examples[c.id].find((e) => e.de === s.sentence)!;
    const body = s.sentence.replace(/[.!?]$/, '');
    const stop = s.sentence.slice(body.length);
    const tokens = body.split(' ').map((t, i, all) =>
      t === s.verb ? `<span class="v">${esc(t)}</span>` : i === all.length - 1 ? `<span class="p">${esc(t)}</span>` : esc(t)).join(' ');
    return `
    <li class="sent">
      <p class="inf" lang="de"><span class="p">${esc(s.particle)}</span><span class="split" aria-hidden="true">|</span><span class="v">${esc(c.term.slice(s.particle.length))}</span> <span class="inf-en">${esc(firstSense(c.en))}</span></p>
      <p class="de" lang="de"><svg class="arc" aria-hidden="true" focusable="false"><path d=""/></svg>${tokens}${esc(stop)}</p>
      <p class="en">${esc(ex.en)}</p>
    </li>`;
  }).join('')}
  </ul>
  <p class="aside">Read this section’s German title again. In a clause like that one the verb puts itself back together: <span lang="de"><i>anruft</i></span>.</p>
</section>`;

  const friends = `
<section class="sec" aria-labelledby="friends">
  ${sectionHead('05', 'False friends', 'When the dialogue goes wrong', 'Falsche Freunde.', 'friends')}
  <div class="friends-intro">
    <p class="lead">Not every lookalike is family. Some German words look English and mean something else entirely. Lexi names the trap on the card the moment you meet one, and gives you the word you meant.</p>
    ${gans({ pose: 'alarm', cls: 'side' })}
  </div>
  <ul class="cards-ff">${FRIENDS.map((k) => {
    const ff = FALSE_FRIENDS[k];
    const c = friendCard(f, k);
    return `
    <li class="ff">
      <button type="button" class="ff-btn" aria-pressed="false">
        <span class="ff-w" lang="de">${term(c)}</span>
        <span class="ff-slot">
          <span class="ff-front"><span class="ff-looks">looks like <i>${esc(ff.looksLike)}</i></span><span class="ff-hint" aria-hidden="true">tap to turn over</span></span>
          <span class="ff-back"><span class="ff-means">means <b>${esc(ff.actually)}</b></span><span class="ff-say">for <i>${esc(ff.looksLike)}</i>, say <span lang="de">${esc(ff.insteadSay)}</span></span></span>
        </span>
      </button>
    </li>`;
  }).join('')}
  </ul>
</section>`;

  const how = `
<section class="sec" aria-labelledby="how">
  ${sectionHead('06', 'The app', 'How Lexi works', 'So funktioniert Lexi.', 'how')}
  <ol class="loop">
    <li><div class="mini"><p class="mini-k">Wörter</p><p class="mini-w" lang="de">${term(f.card('das Wasser'))}</p><p class="mini-g">water</p><p class="mini-hint" aria-hidden="true">↕</p></div>
      <h3>Browse</h3><p>One German word per screen, with its meaning showing. Scroll as far as you like: scrolling never counts as a test.</p></li>
    <li><div class="mini"><p class="mini-k">Wörter</p><p class="mini-w" lang="de">${term(f.card('der Apfel'))}</p><p class="mini-g">apple</p><p class="mini-save" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg></p></div>
      <h3>Save</h3><p>Keep the words that catch you. A save is the one thing Lexi takes from the feed, and it is an instruction: saved words come first.</p></li>
    <li><div class="mini"><p class="mini-k">Üben</p><p class="mini-w" lang="de">${esc(bareOf(buch.term))}</p><p class="mini-keys" aria-hidden="true">${['der', 'die', 'das'].map((a) => `<span${a === buch.gender ? ' class="on"' : ''}>${a}</span>`).join('')}</p></div>
      <h3>Practise</h3><p>Üben practises what you chose: the meaning, the gender, the plural, writing it yourself. Each word comes back just before you would forget it.</p></li>
  </ol>
  <ul class="facts">
    <li><b>${words} words, checked by machine</b><span>Gender, plural, part of speech and pronunciation are looked up in Wiktionary before a card ships, and every example sentence is proven to contain its word.</span></li>
    <li><b>${dictionary} dictionary entries</b><span>For everything else. Clearly marked as unchecked, with one action: note this word.</span></li>
    <li><b>A course, A1 to C2</b><span>Units with short films that explain the grammar a word needs. Films never grade.</span></li>
    <li><b>Stories</b><span>German news on the topics you choose. Tap any word in it.</span></li>
    <li><b>Yours</b><span>No account and no tracking. Your progress lives on your device, and you can back it up whenever you like.</span></li>
    <li><b>Open</b><span>MIT-licensed code, and data that credits every source.</span></li>
  </ul>
</section>`;

  const rulesSec = `
<section class="sec" aria-labelledby="never">
  ${sectionHead('07', 'Her rules', 'What Gans never does', 'Was die Gans nie tut.', 'never')}
  <div class="never">
    ${gans({ pose: 'tilt', cls: 'side' })}
    <div>
      <p class="lead">A mascot is a promise about tone. Hers are short.</p>
      <ul class="nevers">
        <li>She never guilt-trips you about a streak.</li>
        <li>She never grades you for scrolling.</li>
        <li>She never says you know a word until a check has shown it.</li>
        <li>She never passes off a dictionary entry as a checked card.</li>
        <li>She never asks who you are.</li>
      </ul>
    </div>
  </div>
</section>`;

  const end = `
<section class="end" aria-labelledby="bye">
  <p class="bye" id="bye"><span lang="de"><span class="q" aria-hidden="true">„</span>Bis bald.<span class="q" aria-hidden="true">“</span></span> <span class="bye-en">${esc(cap(firstSense(f.card('Bis bald').en)))}.</span></p>
  <p class="ctas"><a class="key" href="./">Open Lexi</a></p>
  ${gans({ pose: 'talk', cls: 'walk' })}
</section>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#faf6e6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#282828" media="(prefers-color-scheme: dark)">
<title>Lexi · German, in dialogue with English</title>
<meta name="description" content="Lexi is a free, open-source German vocabulary app for English speakers: ${esc(words)} machine-checked words, no account, no tracking. Meet Gans, the goose whose footprints are German quotation marks.">
<meta property="og:type" content="website">
<meta property="og:title" content="Lexi · German, in dialogue with English">
<meta property="og:description" content="Language is always in dialogue with itself. Meet Gans, and learn German by listening in.">
<meta property="og:image" content="${esc(origin)}/og-gans.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Gans, Lexi's goose: white, with a teal wing and coral beak and feet, beside the words Language is always in dialogue with itself.">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="stylesheet" href="about.css">
<style>${face('Fraunces', fonts.fraunces, '100 900', 'woff2-variations')}${face('IBM Plex Mono', fonts.mono400, '400')}${face('IBM Plex Mono', fonts.mono700, '700')}</style>
<script src="about.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to the page</a>
<header class="bar">
  <a class="brand" href="./" aria-label="Lexi, open the app"><svg viewBox="0 0 150 150" aria-hidden="true"><rect width="150" height="150" rx="34" fill="#2b2b2b"/><rect x="52" y="40" width="20" height="72" rx="3" fill="#93c1c1"/><rect x="52" y="92" width="60" height="20" rx="3" fill="#93c1c1"/><rect x="88" y="40" width="20" height="22" rx="3" fill="#f39483"/></svg><span>Lexi</span></a>
  <nav aria-label="On this page"><a href="#meet">Gans</a><a href="#shift">Cognates</a><a href="#how">The app</a></nav>
  <a class="open" href="./">Open the app <span aria-hidden="true">→</span></a>
</header>
<main id="main">
${hero}
${trail()}
${meet}
${trail()}
${shift}
${trail()}
${compounds}
${trail()}
${splits}
${trail()}
${friends}
${trail()}
${how}
${trail()}
${rulesSec}
${end}
</main>
<footer class="foot">
  <p><a href="${REPO}">Source on GitHub</a> · <a href="legal.html">Privacy, credits &amp; legal notice</a> · <a href="./">Open Lexi</a></p>
  <p>Code MIT. Etymologies and dictionary glosses from English Wiktionary (CC BY-SA 4.0); example sentences from Lexi’s corpus, some from Tatoeba (CC BY 2.0 FR). Counts are read from the shipped data when this page is built.</p>
</footer>
</body>
</html>
`;
}

/** Write `about.html`, its stylesheet and its script into a built `dist/`. */
export function buildAbout(dist: string, facts = loadFacts()) {
  const assets = existsSync(join(dist, 'assets')) ? readdirSync(join(dist, 'assets')) : [];
  const find = (re: RegExp) => assets.find((f) => re.test(f));
  const html = renderAbout(facts, {
    fonts: {
      fraunces: find(/^fraunces-var-.*\.woff2$/),
      mono400: find(/^ibm-plex-mono-400-.*\.woff2$/),
      mono700: find(/^ibm-plex-mono-700-.*\.woff2$/),
    },
    origin: process.env.LEXI_PUBLIC_ORIGIN || PUBLIC_ORIGIN,
  });
  writeFileSync(join(dist, 'about.html'), html);
  copyFileSync(join(HERE, 'about.css'), join(dist, 'about.css'));
  copyFileSync(join(HERE, 'about.client.js'), join(dist, 'about.js'));
  return html.length;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dist = process.argv[2] ?? join(ROOT, 'dist');
  const bytes = buildAbout(dist);
  console.log(`about: wrote about.html (${(bytes / 1024).toFixed(1)} KB) to ${dist}`);
}

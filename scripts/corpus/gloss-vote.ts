// Gloss vote — when a card's three English fields disagree, which one is lying?
//
// A card carries three independent descriptions of the same German word:
//
//   en    the gloss. **Authored.** The only one the learner ever sees — the feed
//         prints it, the saved list prints it, and the meaning drill makes it the
//         correct answer of a multiple choice.
//   def   the definition. Machine-sourced from Wiktionary, shown in the entry sheet.
//   ex[]  the examples, with their translations. Authored, gated by the matcher.
//
// If two of the three agree and the third does not, the third is the suspect. That
// is the whole idea, and it is a much sharper instrument than the one `corpus:sense`
// uses (gloss against example translations), because a good example *paraphrases* —
// «Er zahlte bar» for `bar` shares nothing with "cash" by accident of phrasing —
// whereas `def` and `en` are two attempts to name the *same referent*, and two
// independent fields agreeing against a third is evidence rather than noise.
//
// ## The check that was tried first, and thrown away
//
// "Gloss and definition share no content word" fires on **3,074 of 6,614 cards**
// (46%) and is worthless. `der Name` is glossed "name" and defined "the word by
// which a person or thing is known"; sharing nothing is what a good definition
// *does*. Recording it here so nobody writes it again: a two-field disagreement is
// the normal state of a well-written card. Only the three-way vote carries signal.
//
// ## What it finds, and it is one bug wearing two coats
//
// Both directions are the same underlying defect — **a homograph whose sense was
// taken from the wrong Wiktionary entry** — and which field got poisoned is an
// accident of which pass wrote it:
//
//   the def is wrong    `die Mutter` "mother" defined as *nut (for a bolt)*
//                       `unter` "under" defined as *jack, knave (playing card)* —
//                         that is `der Unter`, a capitalised noun in Skat
//                       `man` "one / you (general)" defined as *just; only* — `nur`
//                       `zu` "to, toward" defined as *too (excessively)*
//                       `auf` "on / on top of" defined as *finished; gone (food)*
//
//   the gloss is wrong  `wiederholen` glossed **"to bring back, take back"**, with a
//                         definition reading "to repeat" and both examples reading
//                         «Wiederholt es!» — *Repeat it.* Two fields against one, and
//                         the outvoted field is the only one on screen. Rank 848 in
//                         the children's corpus: it is in every school letter, and
//                         *"Können Sie das bitte wiederholen?"* is the most useful
//                         sentence a beginner owns.
//
// ## Precision, stated honestly
//
// About one hit in five is a real defect and the rest are good cards whose fields
// simply phrase things differently — `die Erdbeere` "strawberry" against "A small,
// sweet red fruit with seeds on its skin" is exactly right and fires anyway. So this
// is a **reading order, not a detector**, the same standing rule as `corpus:sense`.
// Read them; do not quote the count as a defect count.
//
// The hits concentrate in **function words and homograph nouns**, and function words
// are the highest-traffic cards in the corpus — which is why a 20% yield is worth the
// read.
//
// Run: npm run corpus:gloss-vote
//      npm run corpus:gloss-vote -- A1        (one level)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Ex { de: string; en: string }
interface Card {
  id: string; term: string; en?: string; def?: string;
  level?: string; pos?: string; ex?: Ex[]; kind?: string;
}

const ROOT = join(import.meta.dirname, '..', '..');
const cards: Card[] = JSON.parse(readFileSync(join(ROOT, 'public/data/vocab.json'), 'utf8'));

/** Words that carry no evidence either way. Deliberately generous: a stop word left
 *  in makes two fields look like they agree when they only share "the", which turns a
 *  real hit into a miss — the expensive direction for a reading order. */
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'is', 'it', 'in', 'on', 'that', 'this',
  'and', 'or', 'be', 'as', 'at', 'for', 'with', 'you', 'i', 'someone', 'something', 'esp',
  'especially', 'usually', 'person', 'make', 'do', 'used', 'by', 'from', 'into', 'out', 'up',
  'not', 'one', 'who', 'which', 'also', 'such', 'have', 'has', 'its', 'their', 'his', 'her',
  'can', 'may', 'other', 'more', 'than', 'when', 'while', 'about', 'over', 'under', 'after',
  'before', 'so', 'no', 'any', 'all', 'way', 'form', 'sense', 'they', 'we', 'he', 'she', 'him',
  'them', 'my', 'your', 'are', 'was', 'were', 'been', 'get', 'got', 'go', 'goes']);

const words = (s?: string) => [...new Set((s ?? '').toLowerCase().match(/[a-zäöüß]+/g) ?? [])]
  .filter((x) => x.length > 2 && !STOP.has(x));

/** Crude suffix trim. A stemmer would be better and is not worth the dependency for a
 *  check whose output a human reads line by line.
 *
 *  **`ies` is handled first, and `die Erdbeere` is why.** Trimming a bare `es` takes
 *  *strawberries* to *strawberrie*, which neither prefixes nor is prefixed by
 *  *strawberry* — so a card glossed "strawberry", defined as a red fruit and
 *  exampled with "Strawberries are red" was reported as a card whose gloss its own
 *  example disagrees with. The plural of a `-y` noun is the single commonest shape
 *  in an English gloss list and it was the one shape the trim could not see. */
const stem = (x: string) => x.replace(/ies$/, 'y').replace(/(ing|ed|es|s)$/, '');

/** Do these two strings share any content word, allowing a prefix match so
 *  "repeat"/"repetition" and "grill"/"grilling" count as agreement? */
function agree(a?: string, b?: string): boolean {
  const A = words(a).map(stem);
  const B = words(b).map(stem);
  if (!A.length || !B.length) return false;
  return A.some((x) => B.some((y) => y === x || y.startsWith(x) || x.startsWith(y)));
}

function main() {
  const only = process.argv[2];
  const hits: Card[] = [];

  for (const c of cards) {
    if (only && c.level !== only) continue;
    const exEn = (c.ex ?? []).map((e) => e.en).join(' ');
    if (!c.def || !c.en || !exEn) continue;
    // **A field with nothing to say cannot lose a vote.** `STOP` is deliberately
    // generous, which is right for a definition and wrong for a gloss: "to get used
    // to" is *entirely* stop words, and so is "form" — so the gloss arrived at the
    // vote with an empty word list, could agree with nothing by construction, and
    // lost every time. Twenty-odd of the reported hits were that, and each one is a
    // perfectly good card. Where a field is all function words, the instrument has
    // no reading and must say so by staying silent.
    if (!words(c.en).length) continue;
    // The vote. The gloss must lose to *both* of the others, and the other two must
    // agree with each other — otherwise all three disagree and the card is simply
    // phrased loosely, which is not evidence of anything.
    if (!agree(c.en, c.def) && !agree(c.en, exEn) && agree(c.def, exEn)) hits.push(c);
  }

  const scope = only ? `${only} cards` : `${cards.length} cards`;
  console.log(`gloss-vote — ${hits.length} of ${scope} have a gloss outvoted by their own`);
  console.log('definition and examples. ~1 in 5 is a real defect; this is a reading order.\n');

  const byLevel: Record<string, number> = {};
  for (const h of hits) byLevel[h.level ?? '?'] = (byLevel[h.level ?? '?'] ?? 0) + 1;
  console.log('  by level:', JSON.stringify(byLevel), '\n');

  for (const h of hits) {
    console.log(`${(h.level ?? '?').padEnd(3)} ${h.term}`);
    console.log(`    gloss (shown to the learner): ${h.en}`);
    console.log(`    definition:                   ${h.def}`);
    console.log(`    example:                      ${h.ex?.[0]?.de} — ${h.ex?.[0]?.en}`);
    console.log('');
  }
}

main();

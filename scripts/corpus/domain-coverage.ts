// Domain coverage — for the *reason* somebody is learning German, is the word
// there at all, and if it is, which of the two layers is it in?
//
// Every other check in this folder asks whether a card is correct. This one asks
// whether the word exists, for the seven domains a person migrating to Germany has
// to survive: a trade, a ward, a clinic, a kitchen, a Behörde, a Grundschule, and a
// Feierabend. And since 2026-09-05 there are two possible answers, which is the
// whole point of running it: `TEACHES` (a machine-verified card with a level, an
// example and an FSRS schedule) and `ANSWERS` (a Wiktionary headword the search
// sheet can define and nothing can study).
//
// ## Why a hand-written probe list and not a frequency cut
//
// Frequency is the wrong instrument for this question. `die Anamnese` is rare in a
// general corpus and unavoidable in a Fachsprachprüfung; `der Aufenthaltstitel` is
// rare on Wikipedia and is the first noun on the letter that decides whether you may
// stay. A CEFR list will not have them either — the CEFR describes *functions*, and
// the vocabulary hung off it is general-purpose by construction.
//
// So the list is authored: 90 words, each one a word a real person in that role
// meets in their first month, and short enough that every entry can be defended.
// It is a floor, not a syllabus. Add to it the next time a persona hits a wall.
//
// ## What a miss means, and what it doesn't
//
// A gap in TEACHES is not automatically a defect — some of this belongs in a
// Fachwortschatz pack rather than the A1–C2 core, and that is a product decision
// this script does not make. What it gives you is the *size and shape* per domain,
// re-derivable in a second, so the decision is argued against a number.
//
// A gap in ANSWERS is closer to a defect: the lookup layer's promise is that any
// German word you meet can be explained, and 93,046 headwords is either enough for
// that or it isn't.
//
// Run: npm run corpus:domains
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface Card { id: string; term: string; en: string; level: string; kind?: string }

const ROOT = join(import.meta.dirname, '..', '..');
const cards: Card[] = JSON.parse(readFileSync(join(ROOT, 'public/data/vocab.json'), 'utf8'));

/** Headword without its article, folded for comparison. */
const bare = (term: string) => term.replace(/^(der|die|das)\s+/i, '').trim();

// ---- layer 1: what Lexi teaches -------------------------------------------
// Ask "does a row matching X exist?", never "what does the map say X is?" — a
// first-wins Map over a corpus with known duplicates silently picks one copy.
// (LESSONS.md, the duplicate-corpus rule.)
const TAUGHT = new Set<string>();
for (const c of cards) TAUGHT.add(bare(c.term).toLowerCase());

// ---- layer 2: what Lexi can answer ----------------------------------------
// `public/data/lex` is 233 shards plus an index whose `bounds[i]` is the first
// folded key in shard i. Rather than re-implement the fold and the binary search
// (and risk this script and the app disagreeing about what "found" means), read
// every shard once. It is 19 MB and takes about a second — this is a build-time
// script, and being obviously correct is worth more here than being fast.
const LEX_DIR = join(ROOT, 'public/data/lex');
const ANSWERED = new Set<string>();
let lexShards = 0;
if (existsSync(join(LEX_DIR, 'index.json'))) {
  const idx = JSON.parse(readFileSync(join(LEX_DIR, 'index.json'), 'utf8')) as { n: number };
  for (let i = 0; i < 400; i++) {
    const f = join(LEX_DIR, `${i}.json`);
    if (!existsSync(f)) continue;
    lexShards++;
    // A shard is `{ e: LexEntry[], f: <inflected form arrows> }`. Headwords are
    // `e[].w`; `f` maps a surface form to the lemma it points at, so a learner who
    // meets *Sicherungen* still gets an answer. Both count as "can be looked up".
    const shard = JSON.parse(readFileSync(f, 'utf8')) as { e?: { w?: string }[]; f?: Record<string, unknown> };
    for (const en of shard.e ?? []) if (en?.w) ANSWERED.add(bare(en.w).toLowerCase());
    for (const k of Object.keys(shard.f ?? {})) ANSWERED.add(k.toLowerCase());
  }
  void idx;
}

const teaches = (w: string) => TAUGHT.has(w.toLowerCase());
const answers = (w: string) => ANSWERED.has(w.toLowerCase());

export const DOMAINS: { name: string; who: string; words: string[] }[] = [
  {
    name: 'Trade & site',
    who: 'Elektroniker seeking Anerkennung; a Baustelle is a spoken-German workplace',
    words: ['Sicherung', 'Steckdose', 'Kabel', 'Leitung', 'Schalter', 'Bohrmaschine',
      'Baustelle', 'Werkzeug', 'Schraube', 'Zange', 'Spannung', 'Erdung',
      'Verteiler', 'Schaltplan', 'Helm', 'Gerüst'],
  },
  {
    name: 'Care & nursing',
    who: 'Pflegefachfrau in Ausbildung; the Anleiterin speaks only German',
    words: ['Pflege', 'Patient', 'Blutdruck', 'Spritze', 'Schicht', 'Verband',
      'Windel', 'Rollstuhl', 'Medikament', 'Puls', 'Sturz', 'Übergabe',
      'Bettpfanne', 'Anleiterin'],
  },
  {
    name: 'Medicine',
    who: 'Doctor sitting the Fachsprachprüfung for Approbation',
    words: ['Anamnese', 'Befund', 'Diagnose', 'Beschwerden', 'Aufklärung',
      'Überweisung', 'Röntgen', 'Blutbild', 'Entlassung', 'Einweisung',
      'Nebenwirkung', 'Vorerkrankung'],
  },
  {
    name: 'Gastro',
    who: 'Chef de partie working toward a Meister',
    words: ['Pfanne', 'Schneidebrett', 'Kühlhaus', 'Bestellung', 'Vorspeise',
      'Nachtisch', 'Allergie', 'Hygiene', 'Trinkgeld', 'Spülmaschine', 'Schicht'],
  },
  {
    name: 'Behörden & work admin',
    who: 'Everybody, in month one, and again at every renewal',
    words: ['Anmeldung', 'Aufenthaltstitel', 'Ausländerbehörde', 'Termin', 'Antrag',
      'Bescheid', 'Formular', 'Meldebescheinigung', 'Steuernummer', 'Krankenkasse',
      'Elterngeld', 'Kündigung', 'Arbeitsvertrag', 'Lohnabrechnung', 'Betriebsrat',
      'Probezeit'],
  },
  {
    name: 'School & family',
    who: 'A parent reading the Elternbrief; a grandparent whose grandchildren answer in German',
    words: ['Elternabend', 'Zeugnis', 'Hausaufgabe', 'Klassenlehrer', 'Kindergarten',
      'Einschulung', 'Entschuldigung', 'Schulranzen', 'Ferien', 'Enkel',
      'Schwiegertochter'],
  },
  {
    name: 'Feierabend',
    who: 'The engineer who works in English and is socially stranded at B2',
    words: ['Feierabend', 'Kollege', 'Mittagspause', 'Wochenende', 'Kneipe',
      'Ausflug', 'Verabredung', 'quatschen', 'Bescheid geben', 'Termin ausmachen'],
  },
];

function main() {
  let taught = 0; let answered = 0; let missing = 0; let total = 0;

  console.log(`domain-coverage — ${cards.length} taught cards · ${ANSWERED.size} lookup headwords across ${lexShards} shards\n`);

  for (const d of DOMAINS) {
    const t = d.words.filter(teaches);
    const a = d.words.filter((w) => !teaches(w) && answers(w));
    const m = d.words.filter((w) => !teaches(w) && !answers(w));
    taught += t.length; answered += a.length; missing += m.length; total += d.words.length;
    console.log(`  ${d.name}  taught ${t.length}/${d.words.length} · lookup-only ${a.length} · absent ${m.length}`);
    console.log(`    ${d.who}`);
    if (a.length) console.log(`    lookup only: ${a.join(', ')}`);
    if (m.length) console.log(`    ABSENT FROM BOTH LAYERS: ${m.join(', ')}`);
    console.log('');
  }

  const pct = (n: number) => ((n / total) * 100).toFixed(1);
  console.log(`  TOTAL  taught ${taught}/${total} (${pct(taught)}%) · lookup-only ${answered} (${pct(answered)}%) · absent ${missing} (${pct(missing)}%)`);
  console.log('\n  taught  = a verified card: level, example, gender, FSRS schedule.');
  console.log('  lookup  = the search sheet can define it; nothing can study it.');
  console.log('  absent  = the app cannot answer "what does this mean?" at all.\n');
}

main();

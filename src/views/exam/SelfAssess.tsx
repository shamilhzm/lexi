// The examiners' own grid, handed to the learner.
//
// Two of the five subtests cannot be machine-marked, and the app refuses to
// pretend otherwise (see the header of lib/exam.ts). What it can do — and what
// no photocopied Modellsatz does — is show the actual criteria, with telc's own
// A/B/C/D descriptors, and make the learner apply them. That is a better use of
// ten minutes than a fake score: the criteria *are* the syllabus for these
// parts, and most candidates lose points on criterion I of the letter for the
// entirely mechanical reason that they answered three of the four Leitpunkte.
//
// The descriptors below are telc's published wording, quoted because a
// paraphrase would change what is being assessed.
import Card from '../../components/ui/Card.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import { BANDS, type Band } from '../../lib/exam.ts';

export interface Criterion {
  key: string;
  n: string;
  title: string;
  /** What is being judged, in telc's words. */
  judges: string;
  /** English gloss of what to look for in your own work. */
  hint: string;
  /** The A/B/C/D descriptors, in order. */
  levels: [string, string, string, string];
  /** Points for A/B/C/D. */
  points: [number, number, number, number];
}

export function CriterionRow({ c, value, onPick }: {
  c: Criterion; value?: Band; onPick: (b: Band) => void;
}) {
  return (
    <Card pad="sm">
      <div className="flex items-baseline gap-2 mb-1">
        <Kicker tone="accent">Kriterium {c.n}</Kicker>
        <span className="text-sm font-bold">{c.title}</span>
      </div>
      <p className="text-xs text-dim leading-relaxed mb-1">{c.judges}</p>
      <p className="text-xs leading-relaxed mb-2.5">{c.hint}</p>
      <div className="grid gap-1.5">
        {BANDS.map((b, i) => {
          const picked = value === b;
          return (
            <button
              key={b} role="radio" aria-checked={picked} onClick={() => onPick(b)}
              className={`tap-44 w-full flex items-start gap-2.5 rounded-md border px-3 py-2 text-left text-sm
                transition-colors ${picked ? 'border-accent bg-panel2' : 'border-line bg-panel2 hover:border-accent'}`}
            >
              <span className={`font-mono font-bold flex-shrink-0 w-4 ${picked ? 'text-accent' : 'text-dim'}`}>{b}</span>
              <span className="flex-1 min-w-0">{c.levels[i]}</span>
              <span className={`font-mono text-2xs tabular-nums flex-shrink-0 pt-0.5 ${picked ? 'text-accent' : 'text-dim'}`}>
                {c.points[i]}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ---- Schriftlicher Ausdruck ------------------------------------------------

export const WRITING_CRITERIA: Criterion[] = [
  {
    key: 'leitpunkte', n: 'I', title: 'Berücksichtigung der Leitpunkte',
    judges: 'Bewertet wird die Berücksichtigung der Leitpunkte.',
    hint: 'Count them. Four bullet points, four passages in your letter — a Leitpunkt you mentioned in '
      + 'half a sentence has not been "inhaltlich angemessen bearbeitet". This is the cheapest criterion '
      + 'to score full marks on and the one most candidates drop a grade in.',
    levels: [
      'Alle vier vorgegebenen Leitpunkte werden inhaltlich angemessen bearbeitet',
      'Drei Leitpunkte werden inhaltlich angemessen bearbeitet',
      'Zwei Leitpunkte werden inhaltlich angemessen bearbeitet',
      'Nur einer oder keiner der Leitpunkte wird angemessen bearbeitet',
    ],
    points: [5, 3, 1, 0],
  },
  {
    key: 'gestaltung', n: 'II', title: 'Kommunikative Gestaltung',
    judges: 'Bewertet werden: die sinnvolle Anordnung der Leitpunkte · die Verknüpfung der Sätze · '
      + 'die inhalts- und adressatenbezogene Ausdrucksweise · der Adressatenbezug (Datum, Anrede, Grußformel).',
    hint: 'Did you write a letter or a list? Check for a date, a greeting, an opening line that reacts to '
      + 'hers, connectors between the four points, and a sign-off. Missing the date alone is a common '
      + 'reason this drops from A to B.',
    levels: ['voll angemessen', 'im Großen und Ganzen angemessen', 'kaum noch akzeptabel', 'insgesamt nicht ausreichend'],
    points: [5, 3, 1, 0],
  },
  {
    key: 'richtigkeit', n: 'III', title: 'Formale Richtigkeit',
    judges: 'Bewertet werden Syntax, Morphologie und Orthografie.',
    hint: 'Be strict but not cruel with yourself: B is "mistakes that do not impede understanding", and '
      + 'that is a normal, passing B1 letter. Reserve C for errors at points where a reader would '
      + 'genuinely lose the thread.',
    levels: [
      'keine oder nur vereinzelte Fehler',
      'Fehler, die das Verständnis nicht beeinträchtigen',
      'Fehler an zentralen Stellen, die das Verständnis erheblich beeinträchtigen',
      'so viele Fehler, dass der Text kaum noch verständlich ist',
    ],
    points: [5, 3, 1, 0],
  },
];

// ---- Mündliche Prüfung -----------------------------------------------------
// Same four criteria for all three parts; only the weighting changes (Teil 1 is
// worth 15, Teil 2 and 3 are worth 30 each). `points` is filled in per Teil.

export function speakingCriteria(teil: 1 | 2 | 3): Criterion[] {
  const main: [number, number, number, number] = teil === 1 ? [4, 3, 1, 0] : [8, 6, 2, 0];
  const pron: [number, number, number, number] = teil === 1 ? [3, 2, 1, 0] : [6, 4, 2, 0];
  return [
    {
      key: 'expression', n: '1', title: 'Ausdrucksfähigkeit',
      judges: 'Bewertet werden die inhalts- und rollenbezogene Ausdrucksweise, Wortschatz und die '
        + 'Verwirklichung der Sprechabsicht.',
      hint: 'Did you have the words for what you actually wanted to say — or did you say something '
        + 'easier instead? Reaching for a synonym is fine; abandoning the point is what costs here.',
      levels: ['voll angemessen', 'im Großen und Ganzen angemessen', 'kaum noch akzeptabel', 'durchgehend nicht ausreichend'],
      points: main,
    },
    {
      key: 'task', n: '2', title: 'Aufgabenbewältigung',
      judges: 'Bewertet werden: die Gesprächsbeteiligung · die Verwendung von Strategien · die '
        + 'Flüssigkeit der Rede.',
      hint: 'This is the criterion about *behaviour*, not language. Did you answer the task that was '
        + 'set, ask your partner back, react to what they said, and — in Teil 3 — actually decide '
        + 'things? Two parallel monologues score badly here even in perfect German.',
      levels: ['voll angemessen', 'im Großen und Ganzen angemessen', 'kaum noch akzeptabel', 'durchgehend nicht ausreichend'],
      points: main,
    },
    {
      key: 'accuracy', n: '3', title: 'Formale Richtigkeit',
      judges: 'Bewertet werden Syntax und Morphologie.',
      hint: 'Spoken B1 is allowed to be untidy. B — "mistakes that do not impede understanding" — is '
        + 'the honest self-assessment for most candidates who pass.',
      levels: [
        'keine oder nur vereinzelte Fehler',
        'Fehler, die das Verständnis nicht beeinträchtigen',
        'Fehler an zentralen Stellen, die das Verständnis erheblich beeinträchtigen',
        'so viele Fehler, dass die Kommunikation zu scheitern droht',
      ],
      points: main,
    },
    {
      key: 'pronunciation', n: '4', title: 'Aussprache und Intonation',
      judges: 'Bewertet werden Aussprache und Intonation. Abweichungen von der Standardaussprache …',
      hint: 'An accent is not a deduction. The question is only whether a listener has to work — and '
        + 'note this criterion is worth less than the other three, in both scales.',
      levels: [
        '… beeinträchtigen das Verständnis nicht',
        '… erschweren gelegentlich das Verständnis',
        '… erschweren das Verständnis erheblich',
        '… machen das Verständnis (nahezu) unmöglich',
      ],
      points: pron,
    },
  ];
}

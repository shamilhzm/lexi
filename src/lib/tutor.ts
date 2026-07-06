// AI tutor for speaking & writing. Builds prompts personalised to the learner
// (level + recurring weak areas from Blind Spots), and parses the model's
// structured feedback. The actual API call goes through lib/ai.ts.
import { parseLooseJSON } from './ai.ts';
import { missStats, placementLevel } from '../store.ts';
import type { CEFR } from '../types.ts';

export interface Correction { original: string; fixed: string; why: string; tag?: string; }
export interface Feedback {
  cefr: string;
  feedback: string;
  corrections: Correction[];
  natural: string;
  followup: string;
}

// The four canonical Goethe-C1 trouble spots, always watched, plus whatever the
// learner has actually been missing lately.
const BASE_WEAK = ['Konjunktiv II', 'Passiv', 'Kasus & Deklination', 'Konnektoren / Satzbau'];

export function learnerProfile(): { level: string; weak: string[] } {
  const level = placementLevel() || 'B1';
  const recent = missStats(30).slice(0, 3).map((s) => s.tag);
  const weak = [...new Set([...recent, ...BASE_WEAK])].slice(0, 5);
  return { level, weak };
}

export function buildMessages(task: string, answer: string): { role: string; content: string }[] {
  const { level, weak } = learnerProfile();
  const system = `You are a warm, precise German tutor preparing a learner for the Goethe-Zertifikat C1. The learner's current level is about ${level}. Recurring weak areas to watch closely: ${weak.join(', ')}. Be encouraging but exact. Reply with a single JSON object and nothing else.`;
  const user = `The learner was asked to respond in German to this prompt:\n"${task}"\n\nTheir response:\n"${answer}"\n\nReturn JSON exactly in this shape:\n{"cefr":"the CEFR level (A1–C2) of THIS response","feedback":"1–2 encouraging sentences in English on what worked and the single most useful thing to improve","corrections":[{"original":"the exact phrase from their response that is wrong","fixed":"the corrected phrase","why":"short English explanation","tag":"a short grammar tag, e.g. Kasus, Verbstellung, Konjunktiv II, Artikel, Wortschatz, Präposition"}],"natural":"a more natural, native-sounding rephrasing of their whole response in German","followup":"a natural follow-up question in German to keep the conversation going"}\nOnly include genuine errors in "corrections" (use [] if the response is essentially correct). Keep "natural" at roughly the learner's level or one step above.`;
  return [{ role: 'system', content: system }, { role: 'user', content: user }];
}

export function parseFeedback(content: string): Feedback {
  const j = parseLooseJSON(content) ?? {};
  const corrections: Correction[] = Array.isArray(j.corrections)
    ? j.corrections
        .filter((c: any) => c && typeof c.original === 'string' && typeof c.fixed === 'string')
        .map((c: any): Correction => ({
          original: c.original,
          fixed: c.fixed,
          why: typeof c.why === 'string' ? c.why : '',
          tag: typeof c.tag === 'string' && c.tag.trim() ? c.tag.trim() : undefined,
        }))
    : [];
  return {
    cefr: typeof j.cefr === 'string' ? j.cefr : '',
    feedback: typeof j.feedback === 'string' ? j.feedback : '',
    corrections,
    natural: typeof j.natural === 'string' ? j.natural : '',
    followup: typeof j.followup === 'string' ? j.followup : '',
  };
}

/** Pull the (possibly still-incomplete) "feedback" string out of a partial JSON
 *  reply, so the tutor's headline comment can type out live while streaming. */
export function streamingFeedbackText(partial: string): string {
  const m = partial.match(/"feedback"\s*:\s*"/);
  if (!m) return '';
  let out = '';
  for (let i = m.index! + m[0].length; i < partial.length; i++) {
    const ch = partial[i];
    if (ch === '\\') { // decode the common escapes; stop cleanly at a dangling backslash
      const next = partial[i + 1];
      if (next === undefined) break;
      out += next === 'n' || next === 't' ? ' ' : next;
      i++;
      continue;
    }
    if (ch === '"') break; // end of the string value
    out += ch;
  }
  return out;
}

// ---- task seeds (writing/speaking prompts by level) ----------------------
export const TASKS: Record<CEFR, { de: string; en: string }[]> = {
  A1: [
    { de: 'Stell dich vor: Wie heißt du, woher kommst du und was machst du gern?', en: 'Introduce yourself.' },
    { de: 'Beschreibe deinen Tag heute. Was hast du gemacht?', en: 'Describe your day today.' },
    { de: 'Was ist dein Lieblingsessen und warum?', en: 'Your favourite food and why.' },
  ],
  A2: [
    { de: 'Beschreibe deinen Arbeitsweg oder Schulweg.', en: 'Describe your commute.' },
    { de: 'Erzähle von deinem letzten Wochenende.', en: 'Talk about last weekend.' },
    { de: 'Was machst du gern in deiner Freizeit?', en: 'What you do in your free time.' },
  ],
  B1: [
    { de: 'Beschreibe eine Reise, die dir besonders gefallen hat.', en: 'Describe a memorable trip.' },
    { de: 'Was sind die Vor- und Nachteile, in einer Großstadt zu leben?', en: 'Pros/cons of city life.' },
    { de: 'Erzähle von einem Hobby und warum es dir wichtig ist.', en: 'A hobby and why it matters.' },
  ],
  B2: [
    { de: 'Sollte man in der Stadt mehr Fahrrad fahren? Begründe deine Meinung.', en: 'Argue: more cycling in cities?' },
    { de: 'Beschreibe ein Problem in deiner Stadt und schlage eine Lösung vor.', en: 'A local problem + solution.' },
    { de: 'Wie hat die Technik dein tägliches Leben verändert?', en: 'How tech changed daily life.' },
  ],
  C1: [
    { de: 'Diskutiere: „Homeoffice ist produktiver als Büroarbeit." Nimm Stellung mit Argumenten.', en: 'Argue: remote vs office work.' },
    { de: 'Welche Rolle sollte der Staat in der Wirtschaft spielen? Begründe differenziert.', en: 'Role of the state in the economy.' },
    { de: 'Erörtere die Chancen und Risiken der künstlichen Intelligenz für die Gesellschaft.', en: 'Opportunities/risks of AI.' },
  ],
  C2: [
    { de: 'Nimm Stellung: „Wirtschaftswachstum und Nachhaltigkeit schließen sich aus." Argumentiere nuanciert.', en: 'Growth vs sustainability.' },
    { de: 'Inwiefern prägt Sprache unser Denken? Entwickle eine begründete Position.', en: 'Does language shape thought?' },
    { de: 'Diskutiere die gesellschaftliche Verantwortung von Großunternehmen.', en: 'Corporate social responsibility.' },
  ],
};

export function tasksForLevel(level: string): { de: string; en: string }[] {
  return TASKS[(level as CEFR)] ?? TASKS.B1;
}

// The optional tutor — reopened 2026-09-24, moved behind Lexi's server 2026-10-04.
// See VISION, "Settled decisions".
//
// ## What it is, and what it is not
//
// Two jobs, both about **language the learner has already met**:
//
//   explain  — a sentence from an article they are reading: what it says, and
//              what makes it hard to read.
//   correct  — what the learner wrote back about that article: the minimum edits
//              to make it right, each named, and one thing to practise.
//
// It is **not** a chatbot, and it never writes a fact onto a card. Cards stay
// looked-up (`lib/wiktionary.ts`) and observed (the learner's own sentence).
// Feedback is advice, shown once, stored in the learner's journal, and never
// feeds FSRS, readiness, Known or any other number. It suggests, and says it can
// be wrong.
//
// ## Through Lexi's server, with no AI key in this browser
//
// Until 2026-10-04 the learner pasted their own provider key here; it sat in
// localStorage and the browser called the provider directly. Anything that runs
// script on the page can read localStorage, and a provider key spends money
// anywhere — so the key moved to the server (`api/tutor.ts`), which also writes
// the prompts and treats article text as data, never as instructions. This
// browser keeps only an **access code**: it works against Lexi's tutor endpoint
// for these two tasks and nothing else, and whoever runs the server can change it
// in a minute. With no code set, no text leaves the device. With one set, still
// nothing leaves until the learner has said yes once to a sentence naming where
// it goes (*consent*).

/** The access code: deliberately *not* in SETTING_KEYS — never in a backup. */
const CODE_KEY = 'lexi.tutor.code.v1';
/** `{ flow, at }` — what the learner agreed to send text to, and when. Also not in
 *  SETTING_KEYS: consent to send text to a company should not travel in a file. */
const AI_CONSENT_KEY = 'lexi.ai.consent.v1';
/** What a yes is a yes to. A yes given to the old bring-your-own-key flow named a
 *  different recipient, so it does not carry over. */
const CONSENT_FLOW = 'lexi-server';

// One-time cleanup of the bring-your-own-key era: a provider key has no business
// in this browser any more, and its config described a flow that no longer exists.
try { localStorage.removeItem('lexi.ai.key.v1'); localStorage.removeItem('lexi.ai.v1'); } catch { /* no storage */ }

export function tutorCode(): string | null {
  try { return localStorage.getItem(CODE_KEY) || null; } catch { return null; }
}
export function setTutorCode(code: string | null) {
  try {
    if (code && code.trim()) localStorage.setItem(CODE_KEY, code.trim());
    else { localStorage.removeItem(CODE_KEY); localStorage.removeItem(AI_CONSENT_KEY); }
  } catch { /* quota */ }
}
export function aiReady(): boolean { return !!tutorCode(); }

// ---- consent ----------------------------------------------------------------------
//
// The gate lives in `complete()`, not in the components, so no future caller can
// send without it — a component that forgets to ask gets a `consent` error, not a
// silent send.

export function aiConsented(): boolean {
  try {
    const v = JSON.parse(localStorage.getItem(AI_CONSENT_KEY) || 'null') as { flow?: string } | null;
    return !!v && v.flow === CONSENT_FLOW;
  } catch { return false; }
}
export function setAiConsent() {
  try { localStorage.setItem(AI_CONSENT_KEY, JSON.stringify({ flow: CONSENT_FLOW, at: Date.now() })); } catch { /* quota */ }
}

/** What leaves the device, in one paragraph — shown by Settings and by the
 *  one-time prompt, so the two can never describe different things. Keep it in
 *  step with `api/tutor.ts` and with `public/legal.html`. */
export function aiDisclosure(): string {
  return `When you ask for an explanation, Lexi sends the sentence, its paragraph and the article’s title; `
    + `when you ask for a correction, it sends what you wrote, the article’s title and the words you were trying to use. `
    + `Your level goes with both. It goes to Lexi’s own server, which passes it to Anthropic (Claude) and keeps none of it — `
    + `Anthropic’s terms and privacy policy apply, including any minimum age. `
    + `Leave out personal details you wouldn’t put in an email.`;
}

export type AiErrorKind = 'no-key' | 'consent' | 'not-configured' | 'auth' | 'rate' | 'network' | 'refused' | 'bad-output' | 'other';
const KINDS: ReadonlySet<string> = new Set(['no-key', 'consent', 'not-configured', 'auth', 'rate', 'network', 'refused', 'bad-output', 'other']);

export class AiError extends Error {
  constructor(message: string, readonly kind: AiErrorKind) {
    super(message);
  }
}

// ---- the two calls ----------------------------------------------------------------

export interface Explanation {
  /** Natural English. */
  translation: string;
  /** The parts that make the sentence hard, each explained. At most four. */
  points: { de: string; note: string }[];
}

export interface CorrectionResult {
  corrected: string;
  natural: string;
  verdict: string;
  issues: { original: string; fix: string; why: string; kind: string }[];
  tip: string;
}

export async function explainSentence(args: { sentence: string; paragraph: string; title: string; level: string }): Promise<Explanation> {
  const r = await complete<Partial<Explanation>>({ task: 'explain', ...args });
  // The server checked the shape; checking again costs nothing and means a
  // misbehaving server cannot put a non-string on screen.
  return {
    translation: String(r.translation ?? ''),
    points: (Array.isArray(r.points) ? r.points : []).slice(0, 4)
      .filter((p) => p && typeof p.de === 'string' && typeof p.note === 'string'),
  };
}

export async function correctWriting(args: { text: string; title: string; level: string; targets: string[] }): Promise<CorrectionResult> {
  const r = await complete<Partial<CorrectionResult>>({ task: 'correct', ...args });
  return {
    corrected: String(r.corrected ?? ''),
    natural: String(r.natural ?? ''),
    verdict: String(r.verdict ?? ''),
    tip: String(r.tip ?? ''),
    issues: (Array.isArray(r.issues) ? r.issues : [])
      .filter((i) => i && typeof i.original === 'string' && typeof i.fix === 'string'),
  };
}

// ---- transport -------------------------------------------------------------------

/** Lexi's tutor endpoint — `api/tutor.ts`, served by the same host as the app. */
export const TUTOR_ENDPOINT = '/api/tutor';

async function complete<T>(body: Record<string, unknown>): Promise<T> {
  const code = tutorCode();
  if (!code) throw new AiError('The tutor isn’t set up on this device', 'no-key');
  if (!aiConsented()) throw new AiError('Lexi needs your OK before it sends text to the tutor', 'consent');
  return post<T>(code, body);
}

async function post<T>(code: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(TUTOR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Lexi-Access': code },
      body: JSON.stringify(body),
    });
  } catch { throw new AiError('Could not reach Lexi’s tutor', 'network'); }
  const j = await res.json().catch(() => null) as { ok?: boolean; result?: unknown; kind?: string; message?: string } | null;
  if (!res.ok || !j?.ok) {
    const kind: AiErrorKind = j?.kind && KINDS.has(j.kind) ? j.kind as AiErrorKind
      : res.status === 401 ? 'auth' : res.status === 429 ? 'rate' : 'other';
    throw new AiError(j?.message || `The tutor answered ${res.status}`, kind);
  }
  return (j.result ?? {}) as T;
}

/** Settings' "Save and test": checks the code and that the server is set up,
 *  without sending any of the learner's text or spending anything. */
export async function testAi(): Promise<void> {
  const code = tutorCode();
  if (!code) throw new AiError('Enter the access code first', 'no-key');
  await post<{ model?: string }>(code, { task: 'ping' });
}

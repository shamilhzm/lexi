// Der Kartenrand — the UI-Lexikon (COHESION-PLAN Phase 6). Every German word
// in the app's own chrome is itself study material: each entry becomes a
// searchable star (`ui:{slug}`) with a dossier in the Marginal, so the
// interface teaches the language it speaks. Pure data — no imports beyond the
// CEFR type; model.ts folds these into the star field.
import type { CEFR } from './model.ts';

export interface UiEntry {
  slug: string;            // ui:{slug} — frozen once shipped
  term: string;
  translation: string;
  pos: 'Nomen' | 'Verb' | 'Adjektiv' | 'Adverb' | 'Wendung' | 'Partikel';
  level: CEFR;
  example?: string;
  where: string;           // which part of the chrome uses it (feld)
}

const N = 'Nomen' as const, V = 'Verb' as const, W = 'Wendung' as const, A = 'Adjektiv' as const;

export const UI_LEXIKON: UiEntry[] = [
  /* — Navigation — */
  { slug: 'atlas', term: 'der Atlas', translation: 'atlas', pos: N, level: 'B1', example: 'Der Atlas zeigt alle Wörter als Orte.', where: 'Navigation' },
  { slug: 'lektion', term: 'die Lektion', translation: 'lesson', pos: N, level: 'A1', example: 'Lektion 3 ist heute dran.', where: 'Navigation' },
  { slug: 'ueben', term: 'üben', translation: 'to practise', pos: V, level: 'A1', example: 'Ich übe jeden Tag zehn Minuten.', where: 'Navigation' },
  { slug: 'tagesblatt', term: 'das Tagesblatt', translation: 'daily paper, dispatch', pos: N, level: 'B2', example: 'Das Tagesblatt bringt die Nachrichten des Tages.', where: 'Navigation' },
  { slug: 'katalog', term: 'der Katalog', translation: 'catalogue', pos: N, level: 'A2', where: 'Navigation' },
  { slug: 'profil', term: 'das Profil', translation: 'profile', pos: N, level: 'A2', where: 'Navigation' },
  /* — Karte & Session — */
  { slug: 'karte', term: 'die Karte', translation: 'card; map', pos: N, level: 'A1', example: 'Heute sind zwölf Karten fällig.', where: 'Üben' },
  { slug: 'ueberspringen', term: 'überspringen', translation: 'to skip', pos: V, level: 'B1', example: 'Zu steil? Du kannst die Karte überspringen.', where: 'Üben' },
  { slug: 'weiter', term: 'weiter', translation: 'further, next', pos: 'Adverb', level: 'A1', where: 'Üben' },
  { slug: 'pruefen', term: 'prüfen', translation: 'to check, test', pos: V, level: 'A2', where: 'Üben' },
  { slug: 'gewusst', term: 'gewusst', translation: 'known (participle of wissen)', pos: V, level: 'A2', example: 'Gewusst! Die Karte wandert weiter.', where: 'Üben' },
  { slug: 'nochmal', term: 'nochmal', translation: 'once again', pos: 'Adverb', level: 'A1', where: 'Üben' },
  { slug: 'richtig', term: 'richtig', translation: 'correct', pos: A, level: 'A1', where: 'Üben' },
  { slug: 'nicht-ganz', term: 'nicht ganz', translation: 'not quite', pos: W, level: 'A1', where: 'Üben' },
  { slug: 'regel', term: 'die Regel', translation: 'rule', pos: N, level: 'A1', where: 'Üben' },
  { slug: 'beispiel', term: 'das Beispiel', translation: 'example', pos: N, level: 'A1', example: 'zum Beispiel = for example', where: 'Üben' },
  { slug: 'wiederholung', term: 'die Wiederholung', translation: 'repetition, review', pos: N, level: 'A2', where: 'Üben' },
  { slug: 'faellig', term: 'fällig', translation: 'due', pos: A, level: 'B1', example: 'Zwölf Karten sind heute fällig.', where: 'Üben' },
  { slug: 'serie', term: 'die Serie', translation: 'series, streak', pos: N, level: 'A2', where: 'Üben' },
  { slug: 'gemerkt', term: 'sich etwas merken', translation: 'to memorise something', pos: W, level: 'A2', example: 'Das habe ich mir gemerkt.', where: 'Üben' },
  { slug: 'rueckgaengig', term: 'rückgängig machen', translation: 'to undo', pos: W, level: 'B1', where: 'Üben' },
  /* — Lektionen & Gap-Check — */
  { slug: 'wortschatz', term: 'der Wortschatz', translation: 'vocabulary', pos: N, level: 'A2', where: 'Lektionen' },
  { slug: 'grammatik', term: 'die Grammatik', translation: 'grammar', pos: N, level: 'A1', where: 'Lektionen' },
  { slug: 'redemittel', term: 'das Redemittel', translation: 'speech device, useful phrase', pos: N, level: 'B1', where: 'Lektionen' },
  { slug: 'wortart', term: 'die Wortart', translation: 'part of speech', pos: N, level: 'B1', where: 'Lektionen' },
  { slug: 'feld', term: 'das Feld', translation: 'field', pos: N, level: 'A1', example: 'Wortschatz in Feldern.', where: 'Lektionen' },
  { slug: 'luecke', term: 'die Lücke', translation: 'gap', pos: N, level: 'B1', example: 'Der Gap-Check findet deine Lücken.', where: 'Lektionen' },
  { slug: 'sicher', term: 'sicher', translation: 'secure, certain', pos: A, level: 'A1', where: 'Lektionen' },
  { slug: 'abbrechen', term: 'abbrechen', translation: 'to cancel, abort', pos: V, level: 'B1', where: 'Lektionen' },
  { slug: 'weiss-ich-nicht', term: 'Weiß ich nicht.', translation: 'I don\'t know.', pos: W, level: 'A1', where: 'Lektionen' },
  /* — Profil — */
  { slug: 'einstufung', term: 'die Einstufung', translation: 'placement, grading', pos: N, level: 'B2', where: 'Profil' },
  { slug: 'stempelbogen', term: 'der Stempelbogen', translation: 'stamp sheet', pos: N, level: 'B2', example: 'Ein Siegel pro gemeisterter Lektion.', where: 'Profil' },
  { slug: 'siegel', term: 'das Siegel', translation: 'seal', pos: N, level: 'B2', where: 'Profil' },
  { slug: 'schwachstelle', term: 'die Schwachstelle', translation: 'weak spot', pos: N, level: 'B2', example: 'Das Dashboard zeigt deine Schwachstellen.', where: 'Profil' },
  { slug: 'fortschritt', term: 'der Fortschritt', translation: 'progress', pos: N, level: 'B1', where: 'Profil' },
  { slug: 'niveau', term: 'das Niveau', translation: 'level', pos: N, level: 'B1', where: 'Profil' },
  { slug: 'gemeistert', term: 'meistern', translation: 'to master', pos: V, level: 'B2', example: 'Lektion 5 ist gemeistert.', where: 'Profil' },
  { slug: 'fehler', term: 'der Fehler', translation: 'mistake', pos: N, level: 'A1', where: 'Profil' },
  /* — Atlas & Marginal — */
  { slug: 'suche', term: 'die Suche', translation: 'search', pos: N, level: 'A2', where: 'Atlas' },
  { slug: 'ort', term: 'der Ort', translation: 'place', pos: N, level: 'A1', example: 'Jedes Wort ist ein Ort auf der Karte.', where: 'Atlas' },
  { slug: 'vermessen', term: 'vermessen', translation: 'to survey (land)', pos: V, level: 'C1', example: 'Das Atlas vermisst das neue Gebiet.', where: 'Atlas' },
  { slug: 'marginal', term: 'das Marginal', translation: 'margin note', pos: N, level: 'C2', where: 'Marginal' },
  { slug: 'stand', term: 'der Stand', translation: 'state, status', pos: N, level: 'B1', where: 'Marginal' },
  { slug: 'schliessen', term: 'schließen', translation: 'to close', pos: V, level: 'A1', where: 'Marginal' },
  /* — Tagesblatt — */
  { slug: 'depesche', term: 'die Depesche', translation: 'dispatch (telegram)', pos: N, level: 'C2', where: 'Tagesblatt' },
  { slug: 'unkartiert', term: 'unkartiert', translation: 'unmapped', pos: A, level: 'C1', example: 'Unkartierte Wörter kennt der Atlas noch nicht.', where: 'Tagesblatt' },
  { slug: 'etappe', term: 'die Etappe', translation: 'stage, leg (of a journey)', pos: N, level: 'B2', example: 'Etappe geschafft!', where: 'Tagesblatt' },
  { slug: 'einfuegen', term: 'einfügen', translation: 'to paste, insert', pos: V, level: 'B1', where: 'Tagesblatt' },
  { slug: 'zu-steil', term: 'zu steil', translation: 'too steep', pos: W, level: 'B1', example: 'Zu steil — die Karte kommt später wieder.', where: 'Üben' }
];

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UI_LEXIKON } from '../src/ui-lexikon.ts';

test('UI-Lexikon: entries are complete and slugs unique', () => {
  const slugs = new Set<string>();
  for (const e of UI_LEXIKON) {
    assert.ok(e.slug && !slugs.has(e.slug), 'duplicate or empty slug: ' + e.slug);
    slugs.add(e.slug);
    assert.ok(e.term.length > 1, e.slug + ' term');
    assert.ok(e.translation.length > 1, e.slug + ' translation');
    assert.ok(e.pos, e.slug + ' pos');
    assert.ok(e.where, e.slug + ' where');
  }
});

// Lint: every load-bearing German word in the chrome must be a Kartenrand
// star — extend this list whenever new chrome copy ships (point 8 of the
// cohesion review: "every single word in the UI is searchable on the map").
const REQUIRED = [
  'der Atlas', 'die Lektion', 'üben', 'das Tagesblatt', 'der Katalog', 'das Profil',
  'die Karte', 'überspringen', 'weiter', 'prüfen', 'richtig', 'die Regel',
  'der Wortschatz', 'die Grammatik', 'das Redemittel', 'die Wortart', 'die Lücke',
  'die Einstufung', 'der Stempelbogen', 'das Siegel', 'die Schwachstelle',
  'das Marginal', 'die Depesche', 'fällig', 'die Etappe', 'zu steil'
];

test('UI-Lexikon: covers the load-bearing chrome vocabulary', () => {
  const terms = new Set(UI_LEXIKON.map((e) => e.term));
  for (const t of REQUIRED) assert.ok(terms.has(t), 'missing chrome term: ' + t);
});

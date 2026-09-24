import { describe, it, expect } from 'vitest';
import { parseFacts, baseFormOf, isNameOnly, kindFromCategories, parseEnDefinitions, stripHtml } from './wiktionary.ts';

// Fixtures are hand-written in de.wiktionary's template shapes, not copied pages.

const lemmaPage = `== Konzept ({{Sprache|Deutsch}}) ==
=== {{Wortart|Substantiv|Deutsch}}, {{n}} ===
{{Deutsch Substantiv Übersicht
|Genus=n
|Nominativ Singular=Konzept
|Nominativ Plural=Konzepte
}}
{{Aussprache}}
:{{IPA}} {{Lautschrift|kɔnˈt͡sɛpt}}

== Konzept ({{Sprache|Englisch}}) ==
=== {{Wortart|Substantiv|Englisch}} ===
{{Englisch Substantiv Übersicht
|Genus=m
}}`;

const formPage = `== Konzepte ({{Sprache|Deutsch}}) ==
=== {{Wortart|Deklinierte Form|Deutsch}} ===
{{Grammatische Merkmale}}
* Nominativ Plural des Substantivs '''[[Konzept]]'''
{{Grundformverweis Dekl|Konzept}}`;

const proseOnlyForm = `== sagte ({{Sprache|Deutsch}}) ==
=== {{Wortart|Konjugierte Form|Deutsch}} ===
* 1. Person Singular Indikativ Präteritum des Verbs '''[[sagen]]'''`;

const surnamePage = `== Müllerson ({{Sprache|Deutsch}}) ==
=== {{Wortart|Nachname|Deutsch}}, {{m}}, {{f}} ===`;

const bothPage = `== Koch ({{Sprache|Deutsch}}) ==
=== {{Wortart|Substantiv|Deutsch}}, {{m}} ===
{{Deutsch Substantiv Übersicht
|Genus=m
|Nominativ Plural=Köche
}}
=== {{Wortart|Nachname|Deutsch}} ===`;

describe('de.wiktionary parsing', () => {
  it('reads only the German section', () => {
    const f = parseFacts(lemmaPage);
    expect([...f.genders]).toEqual(['das']);   // not the English entry's m
    expect(f.plurals).toEqual(['Konzepte']);
    expect(f.ipa).toBe('kɔnˈt͡sɛpt');
    expect([...f.pos]).toEqual(['Substantiv']);
  });
  it('follows an inflected form to its lemma', () => {
    expect(baseFormOf(formPage)).toBe('Konzept');
    expect(baseFormOf(proseOnlyForm)).toBe('sagen');
    expect(baseFormOf(lemmaPage)).toBeNull();
  });
  it('knows a name from a word, and does not call a word that is also a name a name', () => {
    expect(isNameOnly(surnamePage)).toBe(true);
    expect(isNameOnly(bothPage)).toBe(false);
    expect(isNameOnly(lemmaPage)).toBe(false);
  });
});

describe('batched category classification', () => {
  const c = (...xs: string[]) => xs.map((x) => `Kategorie:${x} (Deutsch)`);
  it('calls a surname a name even when it also carries an ungendered Substantiv tag', () => {
    expect(kindFromCategories(c('Nachname', 'Substantiv', 'Grundformeintrag'), false)).toBe('name');
  });
  it('keeps a real noun a lemma', () => {
    expect(kindFromCategories(c('Substantiv', 'Substantiv f', 'Grundformeintrag'), false)).toBe('lemma');
  });
  it('recognises inflected forms, and missing pages', () => {
    expect(kindFromCategories(c('Deklinierte Form'), false)).toBe('form');
    expect(kindFromCategories([], true)).toBe('missing');
  });
});

describe('en.wiktionary glosses', () => {
  it('strips markup and drops nested example lists', () => {
    expect(stripHtml('<a href="/wiki/x">intelligence agency</a>, secret service<ol><li>ex</li></ol>'))
      .toBe('intelligence agency, secret service');
  });
  it('returns plain senses, and a form-of pointer when that is all there is', () => {
    const lemma = { de: [{ partOfSpeech: 'Noun', definitions: [{ definition: '<a>concept</a>' }, { definition: 'plan, draft' }] }] };
    expect(parseEnDefinitions(lemma)).toEqual([{ pos: 'Noun', defs: ['concept', 'plan, draft'], formOf: null }]);
    const form = { de: [{ partOfSpeech: 'Noun', definitions: [{
      definition: '<span class="form-of-definition">plural of <span class="form-of-definition-link"><i><a rel="mw:WikiLink" href="/wiki/Konzept#German" title="Konzept">Konzept</a></i></span></span>',
    }] }] };
    expect(parseEnDefinitions(form)).toEqual([{ pos: 'Noun', defs: [], formOf: 'Konzept' }]);
  });
  it('is empty for a page with no German entry', () => {
    expect(parseEnDefinitions({ en: [] })).toEqual([]);
    expect(parseEnDefinitions(null)).toEqual([]);
  });
});

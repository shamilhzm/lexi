// `taughtPlurals` — which of a page's plurals a learner is taught.
//
// Fixtures are hand-written in de.wiktionary's template shape, cut down to the
// fields the reader looks at: a publisher's page text does not belong in the repo,
// and a fixture that keeps only what is asserted is easier to read than a page.
import { describe, it, expect } from 'vitest';
import { taughtPlurals } from './verify.ts';
import { pluralForm, pluralForms } from '../../src/lib/matcher.ts';

const page = (...sections: string[]) => `== X ({{Sprache|Deutsch}}) ==\n${sections.join('\n')}`;
const noun = (g: string, table: string, headline: string, extra = '') =>
  `=== {{Wortart|Substantiv|Deutsch}}, {{${g}}} ===\n{{Deutsch Substantiv Übersicht\n${table}\n}}\n{{Worttrennung}}\n:${headline}\n${extra}`;

describe('taughtPlurals', () => {
  it('keeps both standard plurals, in the page order', () => {
    const wt = page(noun('f', '|Genus=f\n|Nominativ Plural 1=Pizzas\n|Nominativ Plural 2=Pizzen', 'Piz·za, {{Pl.1}} Piz·zas, {{Pl.2}} Piz·zen'));
    expect(taughtPlurals(wt, 'die')).toEqual({ forms: ['Pizzas', 'Pizzen'], unsure: null });
  });

  it('drops a variant the headline qualifies as regional', () => {
    const wt = page(noun('m', '|Genus=m\n|Nominativ Plural 1=Bogen\n|Nominativ Plural 2=Bögen',
      "Bo·gen, {{Pl.1}} Bo·gen, {{Pl.2}} ''(süddeutsch, österreichisch)'' Bö·gen"));
    expect(taughtPlurals(wt, 'der').forms).toEqual(['Bogen']);
  });

  it('drops a table form the headline does not give', () => {
    const wt = page(noun('m', '|Genus=m\n|Nominativ Plural 1=Schecks\n|Nominativ Plural 2=Schecke', 'Scheck, {{Pl.}} Schecks'));
    expect(taughtPlurals(wt, 'der').forms).toEqual(['Schecks']);
  });

  it('drops a plural an Anmerkung restricts', () => {
    const wt = page(noun('m', '|Genus=m\n|Nominativ Plural 1=Dornen\n|Nominativ Plural 2=Dörner',
      'Dorn, {{Pl.1}} Dor·nen, {{Pl.2}} Dör·ner', '{{Anmerkung}}\n:Der Plural 2 ist umgangssprachlich.'));
    expect(taughtPlurals(wt, 'der').forms).toEqual(['Dornen']);
  });

  it('puts the collective -leute first', () => {
    const wt = page(noun('m', '|Genus=m\n|Nominativ Plural 1=Fachmänner\n|Nominativ Plural 2=Fachleute',
      'Fach·mann, {{Pl.1}} Fach·män·ner, {{Pl.2}} Fach·leu·te'));
    expect(taughtPlurals(wt, 'der').forms).toEqual(['Fachleute', 'Fachmänner']);
  });

  it('pairs Plural N with Genus N in a two-gender table', () => {
    const wt = page(noun('f', '|Genus 1=f\n|Genus 2=n\n|Nominativ Plural 1=Vokabeln\n|Nominativ Plural 2=Vokabel',
      'Vo·ka·bel, {{Pl.1}} Vo·ka·beln, {{Pl.2}} Vo·ka·bel'));
    expect(taughtPlurals(wt, 'die').forms).toEqual(['Vokabeln']);
  });

  it('refuses to choose between homographs whose plurals differ', () => {
    const wt = page(
      noun('m', '|Genus=m\n|Nominativ Plural=Stare', 'Star, {{Pl.}} Sta·re'),
      noun('m', '|Genus=m\n|Nominativ Plural=Stars', 'Star, {{Pl.}} Stars'));
    expect(taughtPlurals(wt, 'der')).toMatchObject({ forms: [], unsure: expect.stringContaining('homographs') });
  });

  it('refuses when a sense line binds a plural to one meaning', () => {
    const wt = page(noun('m', '|Genus=m\n|Nominativ Plural 1=Blöcke\n|Nominativ Plural 2=Blocks',
      'Block, {{Pl.1}} Blö·cke, {{Pl.2}} Blocks', '{{Bedeutungen}}\n:[1] {{K|Plural 1}} großes Stück'));
    expect(taughtPlurals(wt, 'der').unsure).toContain('senses');
  });

  it('reads only the section of the card\'s gender', () => {
    const wt = page(
      noun('n', '|Genus=n\n|Nominativ Plural=Tore', 'Tor, {{Pl.}} To·re'),
      noun('m', '|Genus=m\n|Nominativ Plural=Toren', 'Tor, {{Pl.}} To·ren'));
    expect(taughtPlurals(wt, 'das').forms).toEqual(['Tore']);
  });
});

describe('pluralForms — every consumer reads a multi-plural the same way', () => {
  it('returns every form, and pluralForm the first', () => {
    expect(pluralForms('die Pizza', 'die Pizzas / die Pizzen')).toEqual(['Pizzas', 'Pizzen']);
    expect(pluralForm('die Pizza', 'die Pizzas / die Pizzen')).toBe('Pizzas');
  });
  it('is unchanged for one plural and for the markers', () => {
    expect(pluralForms('der Tisch', 'die Tische')).toEqual(['Tische']);
    expect(pluralForms('das Gold', 'nur Singular')).toEqual([]);
  });
});

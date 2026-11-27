// The moment in German: the number words, the clock as it is spoken, the compound
// a weekday makes with its part of the day, and that every word the slot can name
// is a card. The German is checked line by line, because nothing else checks it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  zahl, ordinal, uhrzeit, uhrzeitFormal, kompositum, gruss, tageszeit, jahreszeit, southern,
  momentOf, nowTerms, seededOrder, allJetztTerms, datum, FOR_NOW, type Tageszeit,
} from './jetzt.ts';

describe('zahl', () => {
  it.each([
    [0, 'null'], [1, 'eins'], [7, 'sieben'], [12, 'zwölf'], [16, 'sechzehn'], [17, 'siebzehn'],
    [20, 'zwanzig'], [21, 'einundzwanzig'], [30, 'dreißig'], [31, 'einunddreißig'], [37, 'siebenunddreißig'],
    [46, 'sechsundvierzig'], [59, 'neunundfünfzig'],
  ])('%i is %s', (n, w) => expect(zahl(n)).toBe(w));
  it('refuses what it cannot say', () => expect(() => zahl(60)).toThrow());
});

describe('ordinal', () => {
  it.each([
    [1, 'erste'], [2, 'zweite'], [3, 'dritte'], [4, 'vierte'], [6, 'sechste'], [7, 'siebte'], [8, 'achte'],
    [11, 'elfte'], [16, 'sechzehnte'], [19, 'neunzehnte'], [20, 'zwanzigste'], [21, 'einundzwanzigste'],
    [26, 'sechsundzwanzigste'], [30, 'dreißigste'], [31, 'einunddreißigste'],
  ])('the %i. is der %s', (n, w) => expect(ordinal(n)).toBe(w));
});

describe('uhrzeit, as people say it', () => {
  it.each([
    [8, 0, 'Es ist acht Uhr.', 'It’s eight o’clock.'],
    [1, 0, 'Es ist ein Uhr.', 'It’s one o’clock.'],
    [13, 0, 'Es ist ein Uhr.', 'It’s one o’clock.'],
    [0, 0, 'Es ist zwölf Uhr.', 'It’s twelve o’clock.'],
    [8, 1, 'Es ist kurz nach acht.', 'It’s just after eight.'],
    [14, 3, 'Es ist kurz nach zwei.', 'It’s just after two.'],
    [14, 4, 'Es ist fünf nach zwei.', 'It’s five past two.'],
    [14, 26, 'Es ist fünf vor halb drei.', 'It’s twenty-five past two.'],
    [14, 27, 'Es ist kurz vor halb drei.', 'It’s just before half past two.'],
    [14, 33, 'Es ist kurz nach halb drei.', 'It’s just after half past two.'],
    [14, 34, 'Es ist fünf nach halb drei.', 'It’s twenty-five to three.'],
    [14, 56, 'Es ist fünf vor drei.', 'It’s five to three.'],
    [14, 57, 'Es ist kurz vor drei.', 'It’s just before three.'],
    [8, 16, 'Es ist Viertel nach acht.', 'It’s quarter past eight.'],
    [8, 5, 'Es ist fünf nach acht.', 'It’s five past eight.'],
    [8, 15, 'Es ist Viertel nach acht.', 'It’s quarter past eight.'],
    [8, 22, 'Es ist zwanzig nach acht.', 'It’s twenty past eight.'],
    [8, 23, 'Es ist fünf vor halb neun.', 'It’s twenty-five past eight.'],
    [8, 28, 'Es ist kurz vor halb neun.', 'It’s just before half past eight.'],
    [19, 30, 'Es ist halb acht.', 'It’s half past seven.'],
    [19, 31, 'Es ist kurz nach halb acht.', 'It’s just after half past seven.'],
    [8, 35, 'Es ist fünf nach halb neun.', 'It’s twenty-five to nine.'],
    [8, 40, 'Es ist zwanzig vor neun.', 'It’s twenty to nine.'],
    [8, 45, 'Es ist Viertel vor neun.', 'It’s quarter to nine.'],
    [8, 50, 'Es ist zehn vor neun.', 'It’s ten to nine.'],
    [8, 55, 'Es ist fünf vor neun.', 'It’s five to nine.'],
    [8, 58, 'Es ist kurz vor neun.', 'It’s just before nine.'],
    [12, 30, 'Es ist halb eins.', 'It’s half past twelve.'],
    [0, 30, 'Es ist halb eins.', 'It’s half past twelve.'],
    [12, 59, 'Es ist kurz vor eins.', 'It’s just before one.'],
    [23, 45, 'Es ist Viertel vor zwölf.', 'It’s quarter to twelve.'],
  ])('%i:%i → %s', (h, m, de, en) => {
    const t = uhrzeit(h, m);
    expect(t.de).toBe(de);
    expect(t.en).toBe(en);
  });

  it('names the half hour a learner reads an hour late, on the clock it means', () => {
    expect(uhrzeit(19, 31).halb).toEqual({ de: 'halb acht', clock: '7:30' });
    expect(uhrzeit(8, 35).halb).toEqual({ de: 'halb neun', clock: '8:30' });
    expect(uhrzeit(0, 30).halb).toEqual({ de: 'halb eins', clock: '12:30' });
    expect(uhrzeit(8, 15).halb).toBeNull();
  });

  it('says every minute of the day without throwing, and never says "ein" before nach, vor or halb', () => {
    for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) {
      const { de } = uhrzeit(h, m);
      expect(de).toMatch(/^Es ist .+\.$/);
      expect(de).not.toMatch(/(nach|vor|halb) ein\b/);
      expect(de).not.toMatch(/eins Uhr/);
    }
  });
});

describe('uhrzeitFormal, as a timetable says it', () => {
  it.each([
    [19, 31, 'neunzehn Uhr einunddreißig'], [19, 1, 'neunzehn Uhr eins'], [21, 0, 'einundzwanzig Uhr'],
    [1, 5, 'ein Uhr fünf'], [0, 5, 'null Uhr fünf'], [12, 0, 'zwölf Uhr'],
  ])('%i:%i → %s', (h, m, w) => expect(uhrzeitFormal(h, m)).toBe(w));
});

describe('kompositum', () => {
  it('joins the day and its part into one word, with the last part’s article', () => {
    expect(kompositum(4, 19)).toMatchObject({
      parts: ['der Donnerstag', 'der Abend'], term: 'der Donnerstagabend', en: 'Thursday evening', turns: false,
    });
    expect(kompositum(1, 7)?.term).toBe('der Montagmorgen');
    expect(kompositum(5, 10)?.term).toBe('der Freitagvormittag');
    expect(kompositum(0, 15)?.term).toBe('der Sonntagnachmittag');
  });
  it('turns the article when the last part is feminine', () => {
    expect(kompositum(4, 23)).toMatchObject({ term: 'die Donnerstagnacht', gender: 'die', turns: true });
  });
  it('names no weekday after midnight, when the night still belongs to yesterday', () => {
    for (const h of [0, 1, 2, 3, 4]) expect(kompositum(5, h)).toBeNull();
  });
});

describe('the greeting and the parts of the day', () => {
  it('greets by the hour, and asks in the small hours', () => {
    expect(gruss(7).de).toBe('Guten Morgen');
    expect(gruss(14).de).toBe('Guten Tag');
    expect(gruss(19).de).toBe('Guten Abend');
    expect(gruss(2).de).toBe('Noch wach?');
  });
  it('divides the day the German way', () => {
    const at = (h: number) => tageszeit(h);
    expect([at(6), at(10), at(12), at(15), at(20), at(23), at(3)])
      .toEqual(['morgen', 'vormittag', 'mittag', 'nachmittag', 'abend', 'nacht', 'nacht']);
  });
  it('speaks the date with its ordinal', () => {
    const mo = momentOf(new Date(2026, 10, 26, 19, 31));
    expect(datum(mo)).toEqual({ de: 'Heute ist der 26. November.', spoken: 'der sechsundzwanzigste' });
  });
});

describe('the season', () => {
  it('is meteorological, and the other way round in the south', () => {
    expect(jahreszeit(10)).toBe('herbst');
    expect(jahreszeit(10, true)).toBe('frühling');
    expect(jahreszeit(11)).toBe('winter');
    expect(jahreszeit(11, true)).toBe('sommer');
    expect(jahreszeit(3)).toBe('frühling');
  });
  it('reads the hemisphere from the time zone and assumes north without one', () => {
    expect(southern('Australia/Sydney')).toBe(true);
    expect(southern('America/Argentina/Buenos_Aires')).toBe(true);
    expect(southern('Pacific/Auckland')).toBe(true);
    expect(southern('Europe/Berlin')).toBe(false);
    expect(southern('America/New_York')).toBe(false);
    expect(southern(undefined)).toBe(false);
  });
  it('calls Friday evening the weekend, and Friday morning not', () => {
    expect(momentOf(new Date(2026, 10, 27, 19, 0)).weekend).toBe(true);
    expect(momentOf(new Date(2026, 10, 27, 9, 0)).weekend).toBe(false);
    expect(momentOf(new Date(2026, 10, 29, 9, 0)).weekend).toBe(true);
  });
});

describe('every word the moment names is a card', () => {
  const cards = (JSON.parse(readFileSync('public/data/cards.json', 'utf8')) as { term: string; kind: string }[])
    .filter((c) => c.kind === 'word');
  const terms = new Set(cards.map((c) => c.term));

  it.each(allJetztTerms())('%s', (t) => expect(terms.has(t)).toBe(true));

  it('has enough for every hour, every day and every month, in either hemisphere', () => {
    const hours: Tageszeit[] = ['morgen', 'vormittag', 'mittag', 'nachmittag', 'abend', 'nacht'];
    for (const tz of hours) expect(FOR_NOW[tz].length).toBeGreaterThanOrEqual(8);
    for (let month = 0; month < 12; month++) for (const h of [6, 10, 12, 15, 20, 23, 2]) for (const day of [1, 5, 6]) {
      for (const south of [false, true]) {
        const mo = { ...momentOf(new Date(2026, month, 1 + day, h, 0)), jahreszeit: jahreszeit(month, south) };
        const { hour, season } = nowTerms(mo);
        expect(hour.length).toBeGreaterThanOrEqual(6);
        expect(season.length).toBeGreaterThanOrEqual(4);
        expect(season.some((t) => hour.includes(t))).toBe(false);
      }
    }
  });
});

describe('seededOrder', () => {
  it('holds still for a seed and moves for another', () => {
    const xs = Array.from({ length: 12 }, (_, i) => i);
    expect(seededOrder(xs, '10-26-abend')).toEqual(seededOrder(xs, '10-26-abend'));
    expect(seededOrder(xs, '10-26-abend')).not.toEqual(seededOrder(xs, '10-27-morgen'));
    expect([...seededOrder(xs, 'x')].sort((a, b) => a - b)).toEqual(xs);
  });
});

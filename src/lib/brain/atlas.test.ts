import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  REGIONS, REGION_BY_ID, HIPPOCAMPUS, RESIDUAL,
  normSector, regionForSector, regionForCardId,
} from './atlas.ts';
import type { SectorMeta } from '../../types.ts';

// `sectors.json` carries the *fine* corpus group, which is what the atlas falls
// back on. The app must pass `SECTOR_FINEGROUP`, not `SectorMeta.group` — by the
// time the app reads it, `GROUP_SUPER` in `src/data/index.ts` has mutated
// `group` in place into the ten coarse market categories. Reading the file
// directly is the only place the fine group survives unmodified.
const SECTORS: SectorMeta[] = JSON.parse(readFileSync('public/data/sectors.json', 'utf8'));
const CARDS = SECTORS.reduce((a, s) => a + s.count, 0);

const ids = new Set(REGIONS.map((r) => r.id));

describe('the atlas is well formed', () => {
  it('has unique ids, and the two named ones exist', () => {
    expect(ids.size).toBe(REGIONS.length);
    expect(ids.has(HIPPOCAMPUS)).toBe(true);
    expect(ids.has(RESIDUAL)).toBe(true);
    expect(REGION_BY_ID.size).toBe(REGIONS.length);
  });

  it('places every region inside a real MNI152 head, on the left', () => {
    for (const r of REGIONS) {
      const [x, y, z] = r.mni;
      expect(x, `${r.id} x`).toBeGreaterThanOrEqual(-72);
      expect(x, `${r.id} x`).toBeLessThanOrEqual(0);   // left hemisphere
      expect(y, `${r.id} y`).toBeGreaterThanOrEqual(-107);
      expect(y, `${r.id} y`).toBeLessThanOrEqual(71);
      expect(z, `${r.id} z`).toBeGreaterThanOrEqual(-60);
      expect(z, `${r.id} z`).toBeLessThanOrEqual(78);
      expect(r.spread, `${r.id} spread`).toBeGreaterThan(0);
    }
  });

  it('cites something for every association it claims', () => {
    // The surface tells the learner this is a map of the literature. A region
    // with no literature behind it makes that a lie.
    for (const r of REGIONS) {
      expect(r.sources.length, `${r.id} has no sources`).toBeGreaterThan(0);
      expect(r.blurb.length, `${r.id} has no blurb`).toBeGreaterThan(20);
    }
  });

  it('keeps the regions far enough apart to read as separate clusters', () => {
    for (let i = 0; i < REGIONS.length; i++) {
      for (let j = i + 1; j < REGIONS.length; j++) {
        const [a, b] = [REGIONS[i], REGIONS[j]];
        const d = Math.hypot(a.mni[0] - b.mni[0], a.mni[1] - b.mni[1], a.mni[2] - b.mni[2]);
        expect(d, `${a.id} and ${b.id} are ${d.toFixed(1)}mm apart`).toBeGreaterThan(12);
      }
    }
  });
});

describe('the mapping is total', () => {
  it('files every sector in the corpus into a known region', () => {
    for (const s of SECTORS) {
      const r = regionForSector(s.name, s.group);
      expect(ids.has(r), `${s.name} → ${r}`).toBe(true);
    }
  });

  it('leaves no semantic region unclaimed', () => {
    // The hippocampus and the caudate are stages, not topics: nothing is filed
    // there by meaning. Every other region must earn its place on the map — an
    // empty one is a modelling error, not an empty set.
    const claimed = new Set(SECTORS.map((s) => regionForSector(s.name, s.group)));
    for (const r of REGIONS) {
      if (r.id === HIPPOCAMPUS || r.id === 'cau') continue;
      expect(claimed.has(r.id), `${r.id} claims no sector`).toBe(true);
    }
  });

  it('keeps the residual small once the corpus’s own catch-all is excluded', () => {
    // `Miscellaneous` is 600 cards the corpus itself declined to classify, so it
    // belongs in the angular gyrus. Everything *else* landing there means the
    // rules have stopped firing — which is exactly how the trailing-`\b` defect
    // below went unnoticed until the numbers were printed.
    const stray = SECTORS
      .filter((s) => normSector(s.name) !== 'miscellaneous')
      .filter((s) => regionForSector(s.name, s.group) === RESIDUAL)
      .reduce((a, s) => a + s.count, 0);
    expect(stray / CARDS).toBeLessThan(0.05);
  });

  it('spreads the corpus across the map instead of piling it in one place', () => {
    const by = new Map<string, number>();
    for (const s of SECTORS) {
      const r = regionForSector(s.name, s.group);
      by.set(r, (by.get(r) ?? 0) + s.count);
    }
    for (const [r, n] of by) expect(n / CARDS, `${r} holds ${n}`).toBeLessThan(0.25);
  });
});

describe('sector names are matched on their normalised form', () => {
  it('collapses the case variants the corpus actually ships', () => {
    // Both spellings are real rows in sectors.json. Matching the raw string
    // scatters one concept across two regions.
    expect(regionForSector('Festivals & Customs')).toBe(regionForSector('Festivals & customs'));
    expect(regionForSector('Colors')).toBe(regionForSector('Colours'));
    expect(regionForSector('Employment Contract')).toBe(regionForSector('Employment contract'));
    expect(regionForSector('Work & Profession')).toBe(regionForSector('Work & profession'));
  });

  it('normalises punctuation and whitespace away', () => {
    expect(normSector('  Food & drink ')).toBe('food drink');
    expect(normSector('Body & Illness')).toBe('body illness');
  });
});

describe('the rules survive inflection', () => {
  // Regression pins. The rules were first written as `\b(?:stem|…)\b`, and the
  // trailing boundary silently broke every plural and inflected form in the
  // file: each of these fell past its rule into a group fallback instead.
  const cases: [sector: string, group: string, region: string][] = [
    ['Animals', 'Nature & Environment', 'ffg'],           // was: ppa, via fallback
    ['Communication', 'Education & Language', 'pstg'],    // was: smg, via fallback
    ['Working Life', 'Miscellaneous', 'tpj'],             // was: ag,  via fallback
    ['Ailments', 'Miscellaneous', 'ins'],                 // was: ag,  via fallback
    ['Emigration & immigration', 'Miscellaneous', 'tpj'], // was: ag,  via fallback
    ['Colors', 'Language Building Blocks', 'ffg'],        // was: ifg, via fallback
  ];
  for (const [sector, group, region] of cases) {
    it(`${sector} → ${region}`, () => expect(regionForSector(sector, group)).toBe(region));
  }
});

describe('a rule that returns the residual still counts as a match', () => {
  // `ag` is both a real outcome and the fallback sentinel. Testing
  // `out === RESIDUAL` to decide whether to fall back sent every legitimately
  // abstract sector to its group instead of to the angular gyrus.
  it('keeps abstract sectors out of their group fallback', () => {
    expect(regionForSector('Science concepts', 'Tech & Science')).toBe(RESIDUAL);
    expect(regionForSector('Abstract', 'Language Building Blocks')).toBe(RESIDUAL);
    expect(regionForSector('Limits of Knowledge', 'Miscellaneous')).toBe(RESIDUAL);
  });
});

describe('rule order encodes the intended reading', () => {
  const cases: [sector: string, group: string, region: string, why: string][] = [
    ['Free time', 'Arts, Media & Leisure', 'pmc', 'leisure, not the clock'],
    ['Time', 'Language Building Blocks', 'ips', 'the clock'],
    ['Studies & Training', 'Travel & Transport', 'smg', 'education, not the gym'],
    ['Fitness and training', 'Travel & Transport', 'pmc', 'the gym'],
    ['Business Ethics', 'Work & Economy', 'amy', 'moral vocabulary in a suit'],
    ['Films & festivals', 'Arts, Media & Leisure', 'stg', 'cinema'],
    ['Festivals & Customs', 'Arts, Media & Leisure', 'tpj', 'cultural practice'],
    ['Language Acquisition & Linguistics', 'Education & Language', 'smg', 'how you learn'],
    ['Language Policy', 'Education & Language', 'tpj', 'who decides'],
    ['Language', 'Education & Language', 'pstg', 'neither'],
    ['Clothes shop', 'Shopping & Clothing', 'pmtg', 'artefacts, not retail'],
    ['Money & shopping', 'Work & Economy', 'ips', 'magnitude'],
    ['Intermediate everyday verbs', 'Arts, Media & Leisure', 'pmc', 'a verb list wearing a costume'],
    ['Personal finance', 'Work & Economy', 'ips', 'finance beats person'],
    ['Body parts', 'Health & Body', 'ffg', 'the body map'],
    ['Body & health', 'Health & Body', 'ins', 'the body from inside'],
    ['Core verbs', 'Language Building Blocks', 'pmc', 'action'],
    ['Adjectives', 'Language Building Blocks', 'atl', 'attributes bind at the hub'],
    ['Grammar', 'Grammar', 'ifg', 'form, not meaning'],
  ];
  for (const [sector, group, region, why] of cases) {
    it(`${sector} → ${region} (${why})`, () => expect(regionForSector(sector, group)).toBe(region));
  }
});

describe('card-id namespaces override the sector', () => {
  it('sends the direction drills to the caudate and grammar to Broca’s', () => {
    // `gym:` and `gram:`/`gex:` are modes, not topics — see the id namespaces in
    // src/store.ts. Switching between your two languages is not a meaning.
    expect(regionForCardId('gym:de-en:voc:A1:der Tisch')).toBe('cau');
    expect(regionForCardId('gram:A1:Der bestimmte Artikel')).toBe('ifg');
    expect(regionForCardId('gex:A1:Der bestimmte Artikel:2')).toBe('ifg');
  });

  it('falls back to the residual for a vocabulary id with no word', () => {
    expect(regionForCardId('voc:A1:der Tisch')).toBe(RESIDUAL);
  });
});

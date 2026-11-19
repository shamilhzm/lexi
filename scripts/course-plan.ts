// The plan table in docs/COURSE.md, generated from data/course.ts — so the doc
// cannot drift from the course it describes (LESSONS: never carry a number forward
// from a doc).
//
//   node scripts/course-plan.ts           print the section
//   node scripts/course-plan.ts --write   replace "## The plan" to the end of docs/COURSE.md
import { readFileSync, writeFileSync } from 'node:fs';
import { COURSE, unitsFor } from '../src/data/course.ts';
import { FILM_BY_ID } from '../src/films/films.ts';
import { ALL_LEVELS } from '../src/types.ts';

const STRAND: Record<string, string> = { kern: 'Kern', beruf: 'Beruf', hochschule: 'Hochschule' };
const cell = (s: string) => s.replace(/\|/g, '\\|');

const date = new Date().toISOString().slice(0, 10);
const films = COURSE.filter((u) => u.film && FILM_BY_ID.has(u.film)).length;
const without = COURSE.length - films;

const out: string[] = ['## The plan', ''];
out.push(`Generated from \`data/course.ts\` by \`node scripts/course-plan.ts --write\` on ${date}.`
  + (without ? ` Units without a film are listed in [BACKLOG.md](BACKLOG.md).` : ' Every unit has a film.'));
for (const level of ALL_LEVELS) {
  out.push('', `### ${level}`, '', '| # | Unit | The situation | The idea | Film |', '|---|---|---|---|---|');
  unitsFor(level).forEach((u, i) => {
    const tag = u.bridge ? ' · *Brücke*' : u.strand ? ` · *${STRAND[u.strand]}*` : '';
    const film = u.film ? FILM_BY_ID.get(u.film) : undefined;
    out.push(`| ${i + 1} | **${cell(u.title)}**${tag} | ${cell(u.en)} | ${cell(u.focus)} | ${film ? `*${cell(film.title)}*` : '—'} |`);
  });
}
out.push('', `*${COURSE.length} units, ${films} films, as of this page.*`, '');
const section = out.join('\n');

if (process.argv.includes('--write')) {
  const path = 'docs/COURSE.md';
  const doc = readFileSync(path, 'utf8');
  const at = doc.indexOf('## The plan');
  if (at < 0) { console.error(`${path}: no "## The plan" heading`); process.exit(1); }
  writeFileSync(path, doc.slice(0, at) + section);
  console.log(`✓ wrote the plan to ${path} (${COURSE.length} units, ${films} films)`);
} else {
  process.stdout.write(section);
}

// Offline self-test for the AI plumbing — no network. Exercises the pure logic
// that hardens enrichment and the tutor: loose-JSON parsing, feedback parsing,
// the streaming feedback extractor, and enrichment validation/dedupe.
//
//   node scripts/ai-selftest.ts        (Node ≥ 22.18 strips types natively)
//   npx tsx scripts/ai-selftest.ts     (fallback on older Node)
//
// tutor.ts pulls in the store, which touches localStorage at import — stub it
// before importing so this runs under plain Node.
(globalThis as any).localStorage ??= {
  getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {},
};

const { parseLooseJSON } = await import('../src/lib/ai.ts');
const { parseFeedback, streamingFeedbackText } = await import('../src/lib/tutor.ts');
const { cardsFromEnrichment } = await import('../src/lib/mining.ts');

let pass = 0, fail = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}`);
  if (!ok) { console.log(`        got : ${JSON.stringify(got)}`); console.log(`        want: ${JSON.stringify(want)}`); fail++; } else pass++;
};
const ok = (name: string, cond: boolean) => { console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}`); cond ? pass++ : fail++; };

console.log('\nparseLooseJSON');
eq('fenced object', parseLooseJSON('```json\n{"a":1}\n```'), { a: 1 });
eq('array with prose', parseLooseJSON('Sure! [{"x":1}] done'), [{ x: 1 }]);
eq('object with prose', parseLooseJSON('Here you go: {"cefr":"B1"} — hope it helps'), { cefr: 'B1' });

console.log('\nparseFeedback');
eq('all fields (fenced + prose)', parseFeedback('```json\n{"cefr":"B2","feedback":"Good.","corrections":[{"original":"ich gehe zu Hause","fixed":"ich gehe nach Hause","why":"direction","tag":"Präposition"}],"natural":"Ich gehe nach Hause.","followup":"Und danach?"}\n```'),
  { cefr: 'B2', feedback: 'Good.', corrections: [{ original: 'ich gehe zu Hause', fixed: 'ich gehe nach Hause', why: 'direction', tag: 'Präposition' }], natural: 'Ich gehe nach Hause.', followup: 'Und danach?' });
eq('missing fields default cleanly', parseFeedback('{}'), { cefr: '', feedback: '', corrections: [], natural: '', followup: '' });
{
  const fb = parseFeedback('{"corrections":[{"original":"a","fixed":"b"},{"original":"x"},{"fixed":"y"},{"original":"c","fixed":"d","why":42,"tag":"   "}]}');
  eq('drops incomplete corrections, coerces why/tag', fb.corrections, [{ original: 'a', fixed: 'b', why: '', tag: undefined }, { original: 'c', fixed: 'd', why: '', tag: undefined }]);
}

console.log('\nstreamingFeedbackText');
eq('before feedback key → empty', streamingFeedbackText('{"cefr":"B1",'), '');
eq('mid-string → partial', streamingFeedbackText('{"cefr":"B1","feedback":"Great sta'), 'Great sta');
eq('escaped newline → space', streamingFeedbackText('{"feedback":"Line one\\nLine two"}'), 'Line one Line two');
eq('stops at closing quote', streamingFeedbackText('{"feedback":"Done.","natural":"…"}'), 'Done.');

console.log('\ncardsFromEnrichment');
{
  const cards = cardsFromEnrichment([
    { input: 'Nachhaltigkeit', term: 'die Nachhaltigkeit', en: 'sustainability', pos: 'noun', level: 'B2', gender: 'die', plural: null, ipa: '/ˈnaːxhaltɪçkaɪt/', example_de: 'Nachhaltigkeit ist wichtig.', example_en: 'Sustainability matters.' },
  ]);
  ok('valid noun kept', cards.length === 1);
  eq('  term keeps article', cards[0].term, 'die Nachhaltigkeit');
  eq('  gender set', cards[0].gender, 'die');
  eq('  ipa slashes stripped', cards[0].ipa, 'ˈnaːxhaltɪçkaɪt');
  eq('  usr: id scheme', cards[0].id, 'usr:die nachhaltigkeit');
  eq('  example carried', cards[0].ex.length, 1);
}
eq('noun w/o gender & no article → dropped', cardsFromEnrichment([{ term: 'Haus', pos: 'noun' }]).length, 0);
{
  const c = cardsFromEnrichment([{ term: 'der Zug', pos: 'noun' }]); // gender recovered from article
  ok('gender recovered from article', c.length === 1 && c[0].gender === 'der');
}
{
  const c = cardsFromEnrichment([{ term: 'schnell', pos: 'nonsense', level: 'Z9' }]);
  ok('bad pos → other, bad level → B1', c.length === 1 && c[0].pos === 'other' && c[0].level === 'B1');
}
eq('malformed (no term) dropped', cardsFromEnrichment([{ en: 'nothing' }]).length, 0);
eq('within-batch dedupe', cardsFromEnrichment([{ term: 'laufen', pos: 'verb' }, { term: 'laufen', pos: 'verb' }]).length, 1);
eq('unwraps {words:[…]}', cardsFromEnrichment({ words: [{ term: 'gehen', pos: 'verb' }] }).length, 1);
eq('non-array/garbage → []', cardsFromEnrichment('not json'), []);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

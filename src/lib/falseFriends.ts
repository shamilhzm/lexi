// Falsche Freunde — the errors an English speaker is *going* to make.
//
// Everything else in Lexi treats German as if the learner arrived with no first
// language. But an English speaker's German mistakes are not random: they are
// predictable from the pair of languages, and the most predictable of all is the
// word that looks like one they already know. Someone who has met `bekommen`
// once will read "become" into it for months, and no amount of spaced repetition
// on "bekommen = to get" removes the pull of the English word — because the
// interference is *from* English, and the card never mentions English's word.
//
// So this names the trap explicitly at the moment the word is revealed: what it
// looks like, what it actually means, and the German for the word they had in
// mind. That last line is the one that does the work — a warning without a
// replacement leaves the learner with a gap where they wanted a word.
//
// Keyed by lowercased lemma (no article). A test pins every key to a card that
// exists in the shipped corpus, so an entry cannot quietly rot into dead weight.
export interface FalseFriend {
  /** The English word it will be mistaken for. */
  looksLike: string;
  /** What the German word actually means. */
  actually: string;
  /** German for the English word the learner had in mind. */
  insteadSay: string;
}

export const FALSE_FRIENDS: Record<string, FalseFriend> = {
  bekommen:    { looksLike: 'become',     actually: 'to get, to receive', insteadSay: 'werden' },
  also:        { looksLike: 'also',       actually: 'so, therefore',      insteadSay: 'auch' },
  aktuell:     { looksLike: 'actually',   actually: 'current, up to date', insteadSay: 'eigentlich, tatsächlich' },
  eventuell:   { looksLike: 'eventually', actually: 'possibly, perhaps',  insteadSay: 'schließlich' },
  sympathisch: { looksLike: 'sympathetic', actually: 'likeable, nice',    insteadSay: 'mitfühlend' },
  chef:        { looksLike: 'chef',       actually: 'boss',               insteadSay: 'der Koch' },
  rat:         { looksLike: 'rat',        actually: 'advice',             insteadSay: 'die Ratte' },
  rock:        { looksLike: 'rock',       actually: 'skirt',              insteadSay: 'der Fels' },
  handy:       { looksLike: 'handy',      actually: 'mobile phone',       insteadSay: 'praktisch' },
  art:         { looksLike: 'art',        actually: 'kind, sort, type',   insteadSay: 'die Kunst' },
  brav:        { looksLike: 'brave',      actually: 'well-behaved',       insteadSay: 'mutig' },
  fast:        { looksLike: 'fast',       actually: 'almost',             insteadSay: 'schnell' },
  gymnasium:   { looksLike: 'gymnasium',  actually: 'academic secondary school', insteadSay: 'die Turnhalle' },
  kind:        { looksLike: 'kind',       actually: 'child',              insteadSay: 'nett, freundlich' },
  see:         { looksLike: 'see',        actually: 'lake (der See), sea (die See)', insteadSay: 'sehen' },
  boot:        { looksLike: 'boot',       actually: 'boat',               insteadSay: 'der Stiefel' },
  hut:         { looksLike: 'hut',        actually: 'hat',                insteadSay: 'die Hütte' },
  tag:         { looksLike: 'tag',        actually: 'day',                insteadSay: 'das Etikett' },
  bald:        { looksLike: 'bald',       actually: 'soon',               insteadSay: 'kahl, glatzköpfig' },
  bad:         { looksLike: 'bad',        actually: 'bath, bathroom',     insteadSay: 'schlecht' },
  fabrik:      { looksLike: 'fabric',     actually: 'factory',            insteadSay: 'der Stoff' },
  notiz:       { looksLike: 'notice',     actually: 'a note, a jotting',  insteadSay: 'die Mitteilung, bemerken' },
  note:        { looksLike: 'note',       actually: 'a school grade; a musical note', insteadSay: 'die Notiz' },
  provision:   { looksLike: 'provision',  actually: 'commission (a fee)', insteadSay: 'die Bestimmung' },
  spenden:     { looksLike: 'to spend',   actually: 'to donate',          insteadSay: 'ausgeben' },
  dom:         { looksLike: 'dome',       actually: 'cathedral',          insteadSay: 'die Kuppel' },
  roman:       { looksLike: 'Roman',      actually: 'a novel',            insteadSay: 'römisch' },
  menü:        { looksLike: 'menu',       actually: 'a set meal',         insteadSay: 'die Speisekarte' },
  meinung:     { looksLike: 'meaning',    actually: 'opinion',            insteadSay: 'die Bedeutung' },
  marmelade:   { looksLike: 'marmalade',  actually: 'jam, of any fruit',  insteadSay: 'die Orangenmarmelade' },
  pension:     { looksLike: 'pension',    actually: 'guesthouse',         insteadSay: 'die Rente' },
  rente:       { looksLike: 'rent',       actually: 'pension',            insteadSay: 'die Miete' },
  kaution:     { looksLike: 'caution',    actually: 'a deposit',          insteadSay: 'die Vorsicht' },
  direktor:    { looksLike: 'director',   actually: 'principal, headteacher', insteadSay: 'der Regisseur' },
  lektüre:     { looksLike: 'lecture',    actually: 'reading, reading matter', insteadSay: 'die Vorlesung' },
};

const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();

/** The trap behind a headword, if it has one. Takes the term with or without
 *  its article, so callers can pass `word.term` straight in. */
export function falseFriend(term: string): FalseFriend | null {
  return FALSE_FRIENDS[stripArticle(term).toLowerCase()] ?? null;
}

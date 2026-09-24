// The reader's data model. Deliberately small: an article is what a publisher's
// feed says about it, plus a body fetched on demand.

/** Where an article came from. Each is a publisher whose feed or API a browser is
 *  allowed to read directly (CORS open) — see `sources.ts` for the terms of each. */
export type SourceId = 'tagesschau' | 'srf' | 'dw' | 'heise';

/** One block of running text. Headings are kept because they are real German and
 *  they structure a long piece; everything else a page carries is dropped. */
export interface Para { kind: 'p' | 'h'; text: string }

export interface Article {
  /** `<source>:<publisher id or url hash>` — stable across fetches. */
  id: string;
  source: SourceId;
  /** The publisher's own page. Always shown: the text is theirs. */
  url: string;
  title: string;
  topline: string | null;
  /** First sentence or summary, as the feed gives it. */
  teaser: string;
  /** ms since epoch; 0 when the feed gave no date. */
  published: number;
  tags: string[];
  /** Where the full text is fetched from, or `null` when only the teaser exists. */
  detail: string | null;
  /** An audio version — DW's slow news ships an mp3. */
  audio: string | null;
  /** False for sources whose feed is a teaser and whose pages a browser cannot read. */
  fullText: boolean;
}

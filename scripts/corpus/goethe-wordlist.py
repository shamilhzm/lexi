"""Extract the headwords of a Goethe-Zertifikat Wortliste PDF — lemmas only.

The A1 list was extracted by hand-described column positions (see relevel-a1.ts,
REBUILD). This is the same method as a script, for the A2 and B1 lists, so the
input to `corpus:examcov` can be re-derived instead of trusted.

  A2  https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_A2_Wortliste.pdf
  B1  https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf

  python3 scripts/corpus/goethe-wordlist.py A2 <A2.pdf> > scripts/corpus/data/goethe-a2-wordlist.txt
  python3 scripts/corpus/goethe-wordlist.py B1 <B1.pdf> > scripts/corpus/data/goethe-b1-wordlist.txt

Needs PyMuPDF (`pip install pymupdf`). Output is gitignored with the rest of
`scripts/corpus/data/`: the syllabus is Goethe's, it is fetched and never
redistributed, and the example sentences — their copyrighted expression — are
never read out of the page at all (only the headword column is).

**By column position, not by text order.** Each page is two columns, each column a
headword strip and an example strip. A headword is whatever starts left of the
example strip; an entry is a run of headword lines closer together than the gap
between entries (principal parts continue an entry: `beenden, / beendet, / hat
beendet`). Sentence-splitting cannot tell a headword from the first word of an
example — three such parses were tried on the A1 list and all failed.
"""
import re
import sys

import fitz  # PyMuPDF

# level -> (first page, last page) of the alphabetical list, 0-based inclusive,
#          and the x where each column's example strip begins.
LAYOUT = {
    'A2': {'pages': (7, 30), 'mid': 297, 'ex': (104, 373), 'gap': 12.5},
    'B1': {'pages': (15, 101), 'mid': 297, 'ex': (130, 409), 'gap': 12.5},
}
ART = re.compile(r'^(der/die|der|die|das)\s+(?=[A-ZÄÖÜ])')


def lines_of(page, cfg):
    """Headword-strip lines per column: [(y, text)], top to bottom."""
    cols = ([], [])
    for x0, y0, _x1, _y1, word, *_ in page.get_text('words'):
        if y0 < 60 or y0 > 790:  # running head and folio
            continue
        c = 0 if x0 < cfg['mid'] else 1
        if x0 < cfg['ex'][c] and (c == 1 or x0 > 30):
            cols[c].append((round(y0), x0, word))
    out = []
    for col in cols:
        rows = {}
        for y, x, w in col:
            key = next((k for k in rows if abs(k - y) <= 2), y)
            rows.setdefault(key, []).append((x, w))
        out.append([(y, ' '.join(w for _, w in sorted(ws))) for y, ws in sorted(rows.items())])
    return out


def entries(cols, gap):
    """Group headword lines into entries, across columns and pages.

    A new entry starts after a vertical gap — unless the line before it ended in
    a comma, which means principal parts are still being listed (`anbieten, bietet
    an,` at the foot of one page, `hat angeboten` at the head of the next)."""
    cur, last, open_comma = [], None, False
    for col in cols:
        last = None                                       # a new column: no gap to measure
        for y, text in col:
            fresh = last is None or y - last > gap
            if cur and fresh and not open_comma:
                yield cur
                cur = []
            cur.append(text)
            last = y
            open_comma = text.rstrip().endswith(',')
    if cur:
        yield cur


def clean(head):
    head = re.sub(r'→.*$', '', head)                       # regional variants
    head = re.sub(r'\((?:D|A|CH|Sg\.|Pl\.|[^)]*)\)', '', head)  # (D) (Sg.) (wen, wem)
    head = head.split(',')[0].strip()
    head = re.sub(r'\s+', ' ', head).strip(' -–/')
    return head


def lemmas(entry):
    """Every headword an entry carries: its first line, plus any later line that
    opens with an article (`der Nachbar, -n, / die Nachbarin, -nen`)."""
    joined = []
    for line in entry:
        if joined and joined[-1].endswith('-') and line[:1].islower() and not ART.match(line):
            joined[-1] = joined[-1][:-1] + line           # das Einkaufs- / zentrum
        elif joined and joined[-1] in ('der/die', 'der', 'die', 'das'):
            joined[-1] += ' ' + line                      # der/die / Bekannte, -n
        else:
            joined.append(line)
    out = []
    for i, line in enumerate(joined):
        if i and not ART.match(line):
            continue
        for part in re.split(r'\s/\s', line):              # der Schüler, - / die Schülerin
            head = clean(part)
            if not head or len(head) == 1:                # section letters
                continue
            m = ART.match(head)
            if m:
                out.append(head)
            else:
                out.extend(h for h in (x.strip(' -') for x in head.split('/')) if len(h) > 1)
    return out


def main():
    level, path = sys.argv[1], sys.argv[2]
    cfg = LAYOUT[level]
    doc = fitz.open(path)
    seen, ordered = set(), []
    cols = [col for pn in range(cfg['pages'][0], cfg['pages'][1] + 1) for col in lines_of(doc[pn], cfg)]
    for entry in entries(cols, cfg['gap']):
        for lemma in lemmas(entry):
            if lemma.isupper() and len(lemma) > 4:        # a page heading
                continue
            if lemma not in seen:
                seen.add(lemma)
                ordered.append(lemma)
    print(f'# Goethe-Zertifikat {level} — Wortliste, alphabetical list (lemmas only)')
    print('# Extracted by scripts/corpus/goethe-wordlist.py from the published PDF, by')
    print('# column position. Not committed, never redistributed; the Wortgruppen pages')
    print('# (numbers, countries, dates) are not in here. Used by corpus:examcov.')
    print()
    for lemma in ordered:
        print(lemma)


if __name__ == '__main__':
    main()

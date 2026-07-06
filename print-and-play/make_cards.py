#!/usr/bin/env python3
"""Lexi Duel print-and-play: 180-card A4 duplex PDF from Lexi's lexicon."""
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth

LEXI = '/sessions/peaceful-funny-goldberg/mnt/Lexi'
OUT = '/sessions/peaceful-funny-goldberg/mnt/outputs/lexi-duel-cards-a4.pdf'

THEMES = [  # (group name, hex color)
    ("Food & Drink", "#c0392b"),
    ("Home & Daily Life", "#d35400"),
    ("Nature & Environment", "#1e8449"),
    ("Travel & Transport", "#2471a3"),
    ("Health & Body", "#16a085"),
    ("Feelings & Relationships", "#a93226"),
    ("Shopping & Clothing", "#884ea0"),
    ("Work & Economy", "#5d6d7e"),
    ("Education & Language", "#b7950b"),
    ("Arts, Media & Leisure", "#6c3483"),
]
LEVEL_MIX = [("A1", 9), ("A2", 6), ("B1", 3)]
LEVEL_COLOR = {"A1": "#16c784", "A2": "#ffb000", "B1": "#ea3943"}

vocab = json.load(open(f'{LEXI}/public/data/vocab.json'))
grp = {s['name']: s['group'] for s in json.load(open(f'{LEXI}/public/data/sectors.json'))}

def pick():
    by = {}
    for w in vocab:
        if w.get('kind') != 'word' or not w.get('en'):
            continue
        g = grp.get(w.get('field'))
        by.setdefault((g, w['level']), []).append(w)
    decks = []
    for name, color in THEMES:
        cards = []
        for lvl, n in LEVEL_MIX:
            pool = [w for w in by.get((name, lvl), []) if len(w['term']) <= 26]
            cards += [(w['term'], w['en'].split(';')[0].strip(), lvl) for w in pool[:n]]
            assert len(pool) >= n, f"{name} {lvl}: only {len(pool)}"
        decks.append((name, color, cards))
    return decks

# ---- layout ----
PW, PH = A4
CW, CH = 63.5 * mm, 88.9 * mm
MX, MY = (PW - 3 * CW) / 2, (PH - 3 * CH) / 2

def fit(text, font, size, maxw, minsize=7):
    while size > minsize and stringWidth(text, font, size) > maxw:
        size -= 0.5
    return size

def ellipsize(text, font, size, maxw):
    if stringWidth(text, font, size) <= maxw:
        return text
    while text and stringWidth(text + "…", font, size) > maxw:
        text = text[:-1].rstrip()
    return text + "…"

def draw_card(c, x, y, theme, color, level, text, lang):
    c.setLineWidth(0.4); c.setStrokeColor(HexColor("#b0b0b0"))
    c.rect(x, y, CW, CH)  # cut line
    band = 11 * mm
    c.setFillColor(HexColor(color))
    c.rect(x, y + CH - band, CW, band, stroke=0, fill=1)
    c.setFillColor(white)
    ts = fit(theme, "Helvetica-Bold", 8.5, CW - 16 * mm)
    c.setFont("Helvetica-Bold", ts)
    c.drawString(x + 3 * mm, y + CH - band / 2 - ts * 0.35, theme)
    # level badge
    c.setFillColor(HexColor(LEVEL_COLOR[level]))
    c.roundRect(x + CW - 11 * mm, y + CH - band / 2 - 2.6 * mm, 8 * mm, 5.2 * mm, 1.2 * mm, stroke=0, fill=1)
    c.setFillColor(HexColor("#111111"))
    c.setFont("Helvetica-Bold", 7.5)
    c.drawCentredString(x + CW - 7 * mm, y + CH - band / 2 - 2.6 * mm + 1.5 * mm, level)
    # main word (article on its own line for German nouns)
    cx, cy = x + CW / 2, y + CH / 2 - 2 * mm
    article, word = "", text
    if lang == "DE":
        parts = text.split(" ", 1)
        if len(parts) == 2 and parts[0] in ("der", "die", "das"):
            article, word = parts
    c.setFillColor(HexColor("#222222"))
    if article:
        c.setFillColor(HexColor(color)); c.setFont("Helvetica", 11)
        c.drawCentredString(cx, cy + 7 * mm, article)
        c.setFillColor(HexColor("#222222"))
    s = fit(word, "Helvetica-Bold", 17, CW - 8 * mm, 9)
    word = ellipsize(word, "Helvetica-Bold", s, CW - 8 * mm)
    c.setFont("Helvetica-Bold", s)
    c.drawCentredString(cx, cy - 2 * mm, word)
    # language marker
    c.setFillColor(HexColor("#999999")); c.setFont("Helvetica", 7)
    c.drawCentredString(cx, y + 4 * mm, lang)

def draw_page(c, cards, side):  # cards: list of 9 dicts or None
    for i, card in enumerate(cards):
        if card is None:
            continue
        row, col = divmod(i, 3)
        if side == "back":
            col = 2 - col  # mirror for long-edge duplex
        x = MX + col * CW
        y = PH - MY - (row + 1) * CH
        theme, color, (de, en, lvl) = card
        text, lang = (de, "DE") if side == "front" else (en, "EN")
        draw_card(c, x, y, theme, color, lvl, text, lang)

def intro_page(c, decks):
    c.setFillColor(HexColor("#0b0e13")); c.rect(0, 0, PW, PH, stroke=0, fill=1)
    c.setFillColor(HexColor("#ffb000")); c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(PW / 2, PH - 45 * mm, "LEXI DUEL")
    c.setFillColor(white); c.setFont("Helvetica", 12)
    c.drawCentredString(PW / 2, PH - 55 * mm, "Print-and-play starter deck · German / English · 180 cards")
    y = PH - 75 * mm
    lines = [
        "HOW TO PRINT",
        "· Print pages 2–41 double-sided, flip on LONG edge, at 100% scale (no 'fit to page').",
        "· Heavier paper (160–200 gsm) makes better cards; or glue sheets to card stock.",
        "· Cut along the grey lines: 9 cards per sheet.",
        "",
        "WHAT'S IN THE BOX",
        "· 10 theme decks of 18 cards each — the colour band is the theme.",
        "· Each deck: 9 easy (A1, green), 6 medium (A2, amber), 3 hard (B1, red).",
        "· German on one side (with der/die/das), English on the other.",
        "· Rules: see the one-page rules sheet (lexi-duel-rules-a4.pdf).",
        "",
        "THEMES",
    ]
    c.setFont("Helvetica", 10.5)
    for ln in lines:
        if ln and not ln.startswith("·"):
            c.setFillColor(HexColor("#ffb000")); c.setFont("Helvetica-Bold", 11)
        else:
            c.setFillColor(white); c.setFont("Helvetica", 10.5)
        c.drawString(30 * mm, y, ln); y -= 6.5 * mm
    for name, color, _ in decks:
        c.setFillColor(HexColor(color)); c.rect(32 * mm, y - 1 * mm, 4 * mm, 4 * mm, stroke=0, fill=1)
        c.setFillColor(white); c.setFont("Helvetica", 10.5)
        c.drawString(39 * mm, y, name); y -= 6.5 * mm
    c.setFillColor(HexColor("#8b97a7")); c.setFont("Helvetica", 8.5)
    c.drawCentredString(PW / 2, 18 * mm, "Part of the open-source Lexi project · vocabulary from the Lexi lexicon (A1–B1)")

decks = pick()
c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("Lexi Duel — print-and-play cards (A4)")
intro_page(c, decks); c.showPage()
allcards = [(name, color, card) for name, color, cards in decks for card in cards]
for i in range(0, len(allcards), 9):
    page = allcards[i:i + 9] + [None] * (9 - len(allcards[i:i + 9]))
    draw_page(c, page, "front"); c.showPage()
    draw_page(c, page, "back"); c.showPage()
c.save()
print("cards:", len(allcards), "| decks:", len(decks))

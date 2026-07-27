#!/usr/bin/env python3
"""Lexi Duel one-page rules sheet (A4)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas

OUT = '/sessions/peaceful-funny-goldberg/mnt/outputs/lexi-duel-rules-a4.pdf'
PW, PH = A4
AMBER, DARK, INK, DIM = HexColor("#b47b00"), HexColor("#0b0e13"), HexColor("#222222"), HexColor("#666666")
L, R = 18 * mm, PW - 18 * mm

c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("Lexi Duel — rules")

# header band
c.setFillColor(DARK); c.rect(0, PH - 34 * mm, PW, 34 * mm, stroke=0, fill=1)
c.setFillColor(HexColor("#ffb000")); c.setFont("Helvetica-Bold", 26)
c.drawString(L, PH - 18 * mm, "LEXI DUEL")
c.setFillColor(white); c.setFont("Helvetica", 12)
c.drawString(L + 62 * mm, PH - 18 * mm, "· The Word Market")
c.setFillColor(HexColor("#8b97a7")); c.setFont("Helvetica", 10)
c.drawString(L, PH - 27 * mm, "2–6 players · ages 8+ · 20–40 min · guess translations, steal cards, corner the market")

y = PH - 44 * mm
def head(t):
    global y
    y -= 3 * mm
    c.setFillColor(AMBER); c.setFont("Helvetica-Bold", 12)
    c.drawString(L, y, t.upper()); y -= 6 * mm

def body(lines, size=10, gap=5.1):
    global y
    c.setFillColor(INK)
    for ln in lines:
        if ln.startswith("**"):
            c.setFont("Helvetica-Bold", size); ln = ln[2:]
        else:
            c.setFont("Helvetica", size)
        c.drawString(L + (4 * mm if ln.startswith("–") else 0), y, ln)
        y -= gap * mm

head("You need")
body(["The 10 colour theme decks (18 cards each) · about 30 chips — coins, beans or buttons · this sheet."])

head("Setup")
body([
 "1.  Shuffle each colour deck. Everyone takes 8 chips; the rest is the pot.",
 "2.  Choose a direction together: German → English (easier) or English → German (harder).",
 "     Decks always sit with the question side up.",
])

head("Each round")
body([
 "**1 · The Market.  Draw 3 colour decks at random and place them in the middle. Going once around",
 "(start left of the last winner; youngest starts the game), each player bids chips or passes. Highest",
 "bidder pays the pot, chooses which of the 3 themes is played, and becomes the first Customer.",
 "",
 "**2 · The Stall — 10 cards.  The player left of the Customer is the Vendor: they draw the top card and",
 "read it aloud. The Customer has 5 seconds to say the translation.",
 "–  Correct → the Customer keeps the card (1 point).",
 "–  Wrong or too slow → anyone else may shout the answer. First correct shout steals the card.",
 "–  Nobody gets it → the Vendor reveals the answer; the card goes face-up into the Bank.",
 "The Customer role moves clockwise after every card. After 10 cards the round ends.",
])

head("The Bank — missed words come back to market")
body([
 "Cards nobody could translate wait face-up in the Bank. They are not lost — they are opportunities.",
 "**Bank bid:  before any Market phase, a player holding 3+ won cards of one colour may put a Bank card",
 "of that colour up for auction. Everyone may bid chips; the triggering player wins ties. The winner must",
 "still translate it correctly — succeed and keep it, fail and it drops back into the Bank.",
 "**Lucky reds:  red (B1) cards you have won are wild — each may stand in for any colour when triggering",
 "a Bank bid. Hard words are the luck of the market.",
])

head("Fair-play rules — mixed levels at one table")
body([
 "**Article rule:  confident speakers only score a noun if they also give der / die / das correctly.",
 "**Swap rule:  beginners and kids may trade in one red (B1) card per round for a fresh card.",
 "Agree before the game who plays under which rule. Grandma decides disputes.",
])

head("End of the game")
body([
 "After 4 market rounds: score 1 point per card won  +  1 point per 2 chips you still hold.",
 "Most points wins the market. Tie? One sudden-death card — first correct shout takes everything.",
])

# variant box
y -= 4 * mm
c.setFillColor(HexColor("#f5efe0")); c.setStrokeColor(AMBER); c.setLineWidth(0.8)
c.roundRect(L, y - 16 * mm, R - L, 19 * mm, 2 * mm, stroke=1, fill=1)
c.setFillColor(AMBER); c.setFont("Helvetica-Bold", 11)
c.drawString(L + 5 * mm, y - 4 * mm, "BLITZMARKT — the 10-minute version")
c.setFillColor(INK); c.setFont("Helvetica", 10)
c.drawString(L + 5 * mm, y - 9.5 * mm, "No chips, no auction. Pick any deck, flip cards one by one: first correct shout keeps the card.")
c.drawString(L + 5 * mm, y - 14.5 * mm, "This is the game the whole thing was built around — start here on family night.")

c.setFillColor(DIM); c.setFont("Helvetica", 8.5)
c.drawString(L, 14 * mm, "Lexi Duel · part of the open-source Lexi project · cards: lexi-duel-cards-a4.pdf · digital version: lexi-duel.html")
c.save()
print("rules done")

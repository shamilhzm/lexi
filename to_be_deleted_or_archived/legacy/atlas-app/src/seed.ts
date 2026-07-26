// Personalized "For You" decks — hand-authored from orbita-content-seed.md
// (Shamil's real interests + life in Cologne). Kept separate from the
// auto-ported data.ts. These surface as topic-tagged stars scattered across the
// galaxy (the `name`/category never groups the map). ~12 cards each.
import type { ThemedDeck } from './data.ts';

export const PERSONAL_DECKS: ThemedDeck[] = [
  { id: 'rad', name: 'Rad & Unterwegs', emoji: '🚲', desc: 'Cycling & getting around', lang: 'de', cards: [
    { front: 'das Rennrad', back: 'road bike', example: 'Mit dem Rennrad fährt er jeden Sonntag an den Rhein.', pos: 'Nomen', level: 'B1' },
    { front: 'die Gangschaltung', back: 'gears / gear shift', example: 'Die Gangschaltung klemmt am Berg.', pos: 'Nomen', level: 'B1' },
    { front: 'die Kette', back: 'chain', example: 'Die Kette ist gerissen und muss geölt werden.', pos: 'Nomen', level: 'A2' },
    { front: 'der Reifen', back: 'tyre', example: 'Der hintere Reifen hat einen Platten.', pos: 'Nomen', level: 'A2' },
    { front: 'der Sattel', back: 'saddle', example: 'Stell den Sattel etwas höher.', pos: 'Nomen', level: 'B1' },
    { front: 'der Lenker', back: 'handlebar', example: 'Am Lenker sind zwei Bremshebel.', pos: 'Nomen', level: 'B1' },
    { front: 'die Strecke', back: 'route / distance', example: 'Die Strecke ist achtzig Kilometer lang.', pos: 'Nomen', level: 'A2' },
    { front: 'die Steigung', back: 'incline / gradient', example: 'Die Steigung beträgt zwölf Prozent.', pos: 'Nomen', level: 'B1' },
    { front: 'die Abfahrt', back: 'descent / departure', example: 'Nach dem Gipfel folgt eine lange Abfahrt.', pos: 'Nomen', level: 'A2' },
    { front: 'die Verspätung', back: 'delay', example: 'Der Zug hat zwanzig Minuten Verspätung.', pos: 'Nomen', level: 'A2' },
    { front: 'die Fahrradkarte', back: 'bike ticket', example: 'Für das Rad brauchst du eine Fahrradkarte.', pos: 'Nomen', level: 'B1' },
    { front: 'der Bahnhof', back: 'train station', example: 'Wir treffen uns am Hauptbahnhof.', pos: 'Nomen', level: 'A2' }
  ]},
  { id: 'kueche', name: 'Café & Küche', emoji: '☕', desc: 'Coffee & kitchen', lang: 'de', cards: [
    { front: 'die Bohne', back: 'bean', example: 'Frische Bohnen schmecken deutlich aromatischer.', pos: 'Nomen', level: 'A2' },
    { front: 'die Kaffeemühle', back: 'coffee grinder', example: 'Die Kaffeemühle mahlt sehr gleichmäßig.', pos: 'Nomen', level: 'B1' },
    { front: 'der Mahlgrad', back: 'grind setting', example: 'Für Espresso brauchst du einen feinen Mahlgrad.', pos: 'Nomen', level: 'B1' },
    { front: 'brühen', back: 'to brew', example: 'Brüh den Kaffee mit heißem, nicht kochendem Wasser.', pos: 'Verb', level: 'B1' },
    { front: 'mahlen', back: 'to grind', example: 'Mahle die Bohnen erst kurz vor dem Aufguss.', pos: 'Verb', level: 'B1' },
    { front: 'rösten', back: 'to roast', example: 'Die Bohnen werden dunkel geröstet.', pos: 'Verb', level: 'B1' },
    { front: 'die Zutat', back: 'ingredient', example: 'Es fehlt nur noch eine Zutat.', pos: 'Nomen', level: 'A2' },
    { front: 'der Teelöffel', back: 'teaspoon', example: 'Gib einen Teelöffel Zucker dazu.', pos: 'Nomen', level: 'A2' },
    { front: 'die Prise', back: 'pinch', example: 'Eine Prise Salz rundet den Geschmack ab.', pos: 'Nomen', level: 'B1' },
    { front: 'rühren', back: 'to stir', example: 'Rühre die Soße ständig, damit sie nicht anbrennt.', pos: 'Verb', level: 'A2' },
    { front: 'abkühlen', back: 'to cool down', example: 'Lass den Kaffee kurz abkühlen.', pos: 'Verb', level: 'B1' },
    { front: 'säuerlich', back: 'slightly sour / acidic', example: 'Der Kaffee schmeckt angenehm säuerlich.', pos: 'Adjektiv', level: 'B1' }
  ]},
  { id: 'holz', name: 'Werkstatt & Holz', emoji: '🪚', desc: 'Workshop & woodworking', lang: 'de', cards: [
    { front: 'die Werkstatt', back: 'workshop', example: 'In seiner Werkstatt steht eine alte Hobelbank.', pos: 'Nomen', level: 'B1' },
    { front: 'das Werkzeug', back: 'tool(s)', example: 'Räum das Werkzeug nach der Arbeit weg.', pos: 'Nomen', level: 'A2' },
    { front: 'die Bohrmaschine', back: 'drill', example: 'Mit der Bohrmaschine geht es schneller.', pos: 'Nomen', level: 'B1' },
    { front: 'der Holzdübel', back: 'wooden dowel', example: 'Die Bretter werden mit Holzdübeln verbunden.', pos: 'Nomen', level: 'B1' },
    { front: 'die Schraube', back: 'screw', example: 'Die Schraube sitzt zu locker.', pos: 'Nomen', level: 'A2' },
    { front: 'das Brett', back: 'board / plank', example: 'Säge das Brett auf einen Meter zu.', pos: 'Nomen', level: 'A2' },
    { front: 'die Säge', back: 'saw', example: 'Die Säge ist nicht mehr scharf.', pos: 'Nomen', level: 'B1' },
    { front: 'schleifen', back: 'to sand', example: 'Schleife die Kanten, bis sie glatt sind.', pos: 'Verb', level: 'B1' },
    { front: 'bohren', back: 'to drill', example: 'Bohre zuerst ein dünnes Loch vor.', pos: 'Verb', level: 'B1' },
    { front: 'leimen', back: 'to glue', example: 'Die Teile werden verleimt und gepresst.', pos: 'Verb', level: 'B1' },
    { front: 'die Vorlage', back: 'template / pattern', example: 'Er arbeitet nach einer eigenen Vorlage.', pos: 'Nomen', level: 'B1' },
    { front: 'der 3D-Drucker', back: '3D printer', example: 'Das Bauteil kommt aus dem 3D-Drucker.', pos: 'Nomen', level: 'B1' }
  ]},
  { id: 'philo', name: 'Das geprüfte Leben', emoji: '🜔', desc: 'Philosophy & the examined life', lang: 'de', cards: [
    { front: 'die Weisheit', back: 'wisdom', example: 'Wahre Weisheit kennt ihre eigenen Grenzen.', pos: 'Nomen', level: 'B2' },
    { front: 'die Tugend', back: 'virtue', example: 'Geduld gilt den Stoikern als Tugend.', pos: 'Nomen', level: 'B2' },
    { front: 'die Aufmerksamkeit', back: 'attention', example: 'Aufmerksamkeit ist die seltenste Form der Großzügigkeit.', pos: 'Nomen', level: 'B2' },
    { front: 'die Freiheit', back: 'freedom', example: 'Freiheit beginnt mit Selbstbeherrschung.', pos: 'Nomen', level: 'B1' },
    { front: 'die Gewohnheit', back: 'habit', example: 'Der Charakter ist die Summe seiner Gewohnheiten.', pos: 'Nomen', level: 'B1' },
    { front: 'das Bewusstsein', back: 'consciousness / awareness', example: 'Das Bewusstsein richtet sich immer auf etwas.', pos: 'Nomen', level: 'C1' },
    { front: 'die Wahrnehmung', back: 'perception', example: 'Unsere Wahrnehmung formt, was wir für wirklich halten.', pos: 'Nomen', level: 'B2' },
    { front: 'die Stille', back: 'stillness / silence', example: 'In der Stille hört man die eigenen Gedanken.', pos: 'Nomen', level: 'B1' },
    { front: 'die Gegenwart', back: 'the present (moment)', example: 'Wer in der Gegenwart lebt, sorgt sich weniger.', pos: 'Nomen', level: 'B2' },
    { front: 'das Streben', back: 'striving / aspiration', example: 'Das Streben nach Sinn treibt den Menschen an.', pos: 'Nomen', level: 'C1' },
    { front: 'die Gelassenheit', back: 'composure / equanimity', example: 'Gelassenheit ist gelernte Distanz zu den Dingen.', pos: 'Nomen', level: 'C1' },
    { front: 'die Vergänglichkeit', back: 'transience / impermanence', example: 'Die Vergänglichkeit macht den Augenblick kostbar.', pos: 'Nomen', level: 'C1' }
  ]},
  { id: 'glaube', name: 'Glaube & Institutionen', emoji: '⛪', desc: 'Faith & institutions', lang: 'de', cards: [
    { front: 'der Glaube', back: 'faith / belief', example: 'Sein Glaube gibt ihm Halt.', pos: 'Nomen', level: 'B2' },
    { front: 'die Kirche', back: 'church', example: 'Die Kirche steht mitten im Dorf.', pos: 'Nomen', level: 'A2' },
    { front: 'die Enzyklika', back: 'encyclical', example: 'Die Enzyklika behandelt soziale Gerechtigkeit.', pos: 'Nomen', level: 'C1' },
    { front: 'das Lehramt', back: 'magisterium / teaching office', example: 'Das Lehramt legt die Glaubenslehre verbindlich aus.', pos: 'Nomen', level: 'C1' },
    { front: 'die Würde', back: 'dignity', example: 'Die Würde des Menschen ist unantastbar.', pos: 'Nomen', level: 'B2' },
    { front: 'die Gerechtigkeit', back: 'justice', example: 'Soziale Gerechtigkeit bleibt eine ständige Aufgabe.', pos: 'Nomen', level: 'B2' },
    { front: 'die Solidarität', back: 'solidarity', example: 'In der Krise zeigt sich echte Solidarität.', pos: 'Nomen', level: 'B2' },
    { front: 'das Gemeinwohl', back: 'common good', example: 'Politik sollte dem Gemeinwohl dienen.', pos: 'Nomen', level: 'C1' },
    { front: 'die Schöpfung', back: 'creation', example: 'Die Bewahrung der Schöpfung ist ein zentrales Anliegen.', pos: 'Nomen', level: 'C1' },
    { front: 'die Verantwortung', back: 'responsibility', example: 'Mit der Macht wächst die Verantwortung.', pos: 'Nomen', level: 'B2' },
    { front: 'die Institution', back: 'institution', example: 'Vertrauen in Institutionen schwindet.', pos: 'Nomen', level: 'B2' },
    { front: 'die Reform', back: 'reform', example: 'Die Reform stieß auf Widerstand.', pos: 'Nomen', level: 'B2' }
  ]},
  { id: 'energie', name: 'Nachhaltigkeit & Energie', emoji: '🜂', desc: 'Sustainability & energy', lang: 'de', cards: [
    { front: 'der Kraftstoff', back: 'fuel', example: 'Nachhaltiger Kraftstoff wird aus Reststoffen gewonnen.', pos: 'Nomen', level: 'B2' },
    { front: 'die Nachhaltigkeit', back: 'sustainability', example: 'Nachhaltigkeit ist mehr als ein Schlagwort.', pos: 'Nomen', level: 'B2' },
    { front: 'der Wasserstoff', back: 'hydrogen', example: 'Grüner Wasserstoff entsteht durch Elektrolyse.', pos: 'Nomen', level: 'B2' },
    { front: 'die Emission', back: 'emission', example: 'Die Emissionen sollen bis 2030 sinken.', pos: 'Nomen', level: 'B2' },
    { front: 'erneuerbar', back: 'renewable', example: 'Erneuerbare Energien decken einen wachsenden Anteil.', pos: 'Adjektiv', level: 'B2' },
    { front: 'die Umwelt', back: 'environment', example: 'Der Verkehr belastet die Umwelt stark.', pos: 'Nomen', level: 'B1' },
    { front: 'der Klimawandel', back: 'climate change', example: 'Der Klimawandel beschleunigt sich.', pos: 'Nomen', level: 'B2' },
    { front: 'die Anlage', back: 'facility / plant (also: investment)', example: 'Die Anlage erzeugt Strom aus Sonnenlicht.', pos: 'Nomen', level: 'B2' },
    { front: 'der Wirkungsgrad', back: 'efficiency (ratio)', example: 'Der Wirkungsgrad der Anlage liegt bei sechzig Prozent.', pos: 'Nomen', level: 'C1' },
    { front: 'die Skalierung', back: 'scaling', example: 'Die Skalierung der Technologie ist die größte Hürde.', pos: 'Nomen', level: 'C1' },
    { front: 'die Forschung', back: 'research', example: 'Die Forschung macht rasche Fortschritte.', pos: 'Nomen', level: 'B2' },
    { front: 'die Herstellung', back: 'production / manufacture', example: 'Die Herstellung ist noch sehr teuer.', pos: 'Nomen', level: 'B2' }
  ]},
  { id: 'behoerden', name: 'Behörden & Papierkram', emoji: '🗂', desc: 'Bureaucracy & paperwork', lang: 'de', cards: [
    { front: 'das Bürgeramt', back: 'citizens’ office', example: 'Beim Bürgeramt bekommst du nur mit Termin einen Platz.', pos: 'Nomen', level: 'B1' },
    { front: 'der Aufenthaltstitel', back: 'residence permit', example: 'Sein Aufenthaltstitel läuft im März ab.', pos: 'Nomen', level: 'C1' },
    { front: 'die Krankenversicherung', back: 'health insurance', example: 'Ohne Krankenversicherung geht in Deutschland nichts.', pos: 'Nomen', level: 'B1' },
    { front: 'die Kündigung', back: 'termination / notice', example: 'Die Kündigung muss schriftlich erfolgen.', pos: 'Nomen', level: 'B2' },
    { front: 'die Frist', back: 'deadline', example: 'Die Frist läuft am Monatsende ab.', pos: 'Nomen', level: 'B1' },
    { front: 'der Termin', back: 'appointment', example: 'Ich habe morgen einen Termin beim Amt.', pos: 'Nomen', level: 'A2' },
    { front: 'die Steuererklärung', back: 'tax return', example: 'Die Steuererklärung ist bis Juli fällig.', pos: 'Nomen', level: 'B2' },
    { front: 'der Antrag', back: 'application / request', example: 'Den Antrag musst du unterschreiben.', pos: 'Nomen', level: 'B1' },
    { front: 'die Unterschrift', back: 'signature', example: 'Hier fehlt noch deine Unterschrift.', pos: 'Nomen', level: 'A2' },
    { front: 'die Gebühr', back: 'fee', example: 'Für den Ausweis fällt eine Gebühr an.', pos: 'Nomen', level: 'B1' },
    { front: 'die Bescheinigung', back: 'certificate / confirmation', example: 'Bring eine Bescheinigung vom Arbeitgeber mit.', pos: 'Nomen', level: 'B2' },
    { front: 'das Formular', back: 'form', example: 'Füll bitte das Formular vollständig aus.', pos: 'Nomen', level: 'A2' }
  ]}
];

// Fills the two parts of legal.html that live in data, not prose.
//
// Plain script, no build step and no framework: the page must work without the
// app bundle. Everything is written with textContent — the operator types
// legal.json by hand, and a stray `<` in an address must not become markup.
(function () {
  'use strict';

  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text != null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function filled(v) { return typeof v === 'string' && v.trim() !== ''; }

  // ---- Impressum ------------------------------------------------------------
  // Rendered only when every field a serviceable address needs is present.
  // Anything less stays "pending": a half-filled Impressum reads as complete and
  // is not, which is worse than saying plainly that it is missing.
  fetch('./legal.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j) return;
      if (filled(j.updated)) document.getElementById('updated').textContent = j.updated;
      var i = j.impressum || {};
      var need = ['name', 'street', 'postcode', 'city', 'email'];
      if (!need.every(function (k) { return filled(i[k]); })) return;
      var box = document.getElementById('impressum-body');
      box.textContent = '';
      box.appendChild(el('p', 'Angaben gemäß § 5 DDG und § 18 Abs. 1 MStV', 'dim'));
      var a = el('address');
      [i.name, i.street, i.postcode + ' ' + i.city, filled(i.country) ? i.country : null]
        .filter(Boolean)
        .forEach(function (line, n) { if (n) a.appendChild(document.createElement('br')); a.appendChild(document.createTextNode(line)); });
      box.appendChild(a);
      var p = el('p', 'E-Mail: ');
      var m = el('a', i.email);
      m.href = 'mailto:' + i.email;
      p.appendChild(m);
      box.appendChild(p);
      box.appendChild(el('p', 'Lexi ist ein privates, nicht-kommerzielles Open-Source-Projekt. Nachrichtenbeiträge ruft der Browser der Nutzerinnen und Nutzer direkt bei den jeweiligen Anbietern ab; für deren Inhalte sind diese verantwortlich.', 'dim'));
    })
    .catch(function () { /* offline: the page keeps saying "pending", which is true of what it can show */ });

  // ---- Recordings -------------------------------------------------------------
  // Straight from the manifest the app plays from, so the list cannot drift from
  // what ships. CC BY asks for the creator's name; this is where every one is.
  fetch('./data/audio.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) {
      if (!m) return;
      var by = {};
      Object.keys(m).forEach(function (id) {
        var e = m[id] || {};
        var who = filled(e.by) ? e.by : 'a Tatoeba contributor';
        var key = who + '\u0000' + (e.license || '');
        (by[key] = by[key] || { who: who, license: e.license || 'licence recorded in audio.json', url: e.attribution, n: 0 }).n++;
      });
      var list = document.getElementById('recording-list');
      Object.keys(by).sort().forEach(function (k) {
        var r = by[k];
        var li = el('li');
        if (filled(r.url)) { var a = el('a', r.who); a.href = r.url; li.appendChild(a); }
        else li.appendChild(document.createTextNode(r.who));
        li.appendChild(document.createTextNode(' (Tatoeba), ' + r.license + ' — ' + r.n + (r.n === 1 ? ' recording' : ' recordings')));
        list.appendChild(li);
      });
    })
    .catch(function () { /* the paragraph above still says where credits live */ });
})();

// Fills the part of legal.html that lives in data, not prose: the Impressum.
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

})();

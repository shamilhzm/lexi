// about.js — the about page's only script (scripts/pages/about.ts copies it into
// dist/). It animates and toggles. It reads and writes nothing a learner owns:
// no storage, no network, no store. Without it the page says everything, with every
// compound split and every false friend turned over.
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ── Gans: press her and she talks, German first, then the English it answers ──
  const btn = document.querySelector('.gans-btn');
  const bubble = document.getElementById('bubble');
  const goose = btn && btn.querySelector('svg');
  let lines = [];
  try { lines = JSON.parse((btn && btn.dataset.lines) || '[]'); } catch { lines = []; }
  let said = 1, answer = 0;

  // She honked until 2026-11-26 — two synthesised sawtooth honks through Web Audio.
  // Lexi is silent until an open German voice exists (VISION, *A closed voice*), and
  // a page that honks while the app cannot say a word would be the wrong way round.

  function say(text, lang) {
    bubble.innerHTML = `<span lang="${lang}">${lang === 'de' ? `„${esc(cap(text))}“` : esc(text)}</span>`;
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
  }
  function talk(ms) {
    goose.classList.add('talking');
    setTimeout(() => goose.classList.remove('talking'), ms);
  }

  if (btn && bubble && goose && lines.length) {
    btn.addEventListener('click', () => {
      const [de, en] = lines[said % lines.length];
      said++;
      talk(380);
      say(de, 'de');
      clearTimeout(answer);
      answer = setTimeout(() => { talk(260); say(en, 'en'); }, 1100);
    });

    // She looks where you point, within the cone a goose can turn her head.
    const heads = [...goose.querySelectorAll('.gans-head')];
    if (!reduce && matchMedia('(pointer: fine)').matches) {
      let frame = 0;
      addEventListener('pointermove', (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const r = goose.getBoundingClientRect();
          const hx = r.left + (160 / 240) * r.width, hy = r.top + (58 / 236) * r.height;
          let a = (Math.atan2(e.clientY - hy, e.clientX - hx) * 180) / Math.PI;
          if (Math.abs(a) > 110) a = 0;
          a = Math.max(-24, Math.min(24, a));
          heads.forEach((h) => h.setAttribute('transform', `rotate(${a.toFixed(1)} 160 50)`));
        });
      }, { passive: true });
    }
    if (!reduce) {
      const eye = goose.querySelectorAll('.gans-eye');
      const blink = () => {
        eye.forEach((e) => e.setAttribute('transform', 'translate(166 44) scale(1 .12) translate(-166 -44)'));
        setTimeout(() => eye.forEach((e) => e.removeAttribute('transform')), 130);
        setTimeout(blink, 2400 + Math.random() * 3600);
      };
      setTimeout(blink, 1800);
    }
  }

  // ── The shift machine: one pair at a time, from the pattern you pick ──────────
  const machine = document.querySelector('.machine');
  const rules = [...document.querySelectorAll('.rule-btn')];
  if (machine && rules.length) {
    const words = machine.querySelector('.m-words');
    const mDe = machine.querySelector('.m-de'), mEn = machine.querySelector('.m-en');
    const pause = machine.querySelector('.m-pause');
    let rule = 0, ex = 0, picked = false, paused = reduce, visible = false;
    const mark = (w, src, side, flags) => {
      let re;
      try { re = new RegExp(src, flags); } catch { return esc(w); }
      const m = re.exec(w);
      if (!m || !m[0]) return esc(w);
      return `${esc(w.slice(0, m.index))}<mark class="${side}">${esc(m[0])}</mark>${esc(w.slice(m.index + m[0].length))}`;
    };
    const show = () => {
      const b = rules[rule];
      const pairs = JSON.parse(b.dataset.ex), mk = JSON.parse(b.dataset.mark);
      const [de, en] = pairs[ex % pairs.length];
      mDe.textContent = b.dataset.de;
      mEn.textContent = b.dataset.en;
      words.innerHTML = `<span class="m-w de" lang="de">${mark(de, mk[0], 'de', 'i')}</span><span class="m-w en">${mark(en, mk[1], 'en', '')}</span>`;
      words.classList.remove('swap');
      void words.offsetWidth;
      words.classList.add('swap');
    };
    const select = (i) => {
      rule = i;
      ex = 0;
      rules.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
      show();
    };
    rules.forEach((b, i) => b.addEventListener('click', () => { picked = true; select(i); }));
    words.addEventListener('click', () => { ex++; show(); });
    if (pause) {
      pause.hidden = reduce;
      pause.addEventListener('click', () => {
        paused = !paused;
        pause.setAttribute('aria-pressed', String(paused));
        pause.textContent = paused ? 'Play' : 'Pause';
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(machine);
    }
    setInterval(() => {
      if (paused || !visible || document.hidden) return;
      ex++;
      if (!picked && ex >= JSON.parse(rules[rule].dataset.ex).length) select((rule + 1) % rules.length);
      else show();
    }, 2600);
  }

  // ── Compounds split, false friends turn over ───────────────────────────────────
  document.querySelectorAll('.spec-btn').forEach((b) =>
    b.addEventListener('click', () => b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true'))));
  const alarmed = document.querySelector('.friends-intro .gans');
  document.querySelectorAll('.ff-btn').forEach((b) =>
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      if (on && alarmed && !reduce) {
        alarmed.classList.remove('startle');
        void alarmed.getBoundingClientRect();
        alarmed.classList.add('startle');
      }
    }));

  // ── The arc from a verb to the half of it that waits at the end ────────────────
  const arcs = () => {
    document.querySelectorAll('.sent .de').forEach((p) => {
      const v = p.querySelector('.v'), q = p.querySelector('.p'), path = p.querySelector('.arc path');
      if (!v || !q || !path) return;
      const box = p.getBoundingClientRect(), a = v.getBoundingClientRect(), b = q.getBoundingClientRect();
      const x1 = a.left - box.left + a.width / 2, y1 = a.top - box.top + 4;
      const x2 = b.left - box.left + b.width / 2, y2 = b.top - box.top + 4;
      const top = Math.min(y1, y2) - Math.min(34, 14 + Math.abs(x2 - x1) * 0.12);
      path.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)} C${x1.toFixed(1)} ${top.toFixed(1)} ${x2.toFixed(1)} ${top.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    });
  };
  arcs();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(arcs);
  let resize = 0;
  addEventListener('resize', () => { clearTimeout(resize); resize = setTimeout(arcs, 120); });
})();

/* Tryb — Neon Arena interactions. No dependencies. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const coarse = matchMedia('(max-width: 760px), (pointer: coarse)').matches;

  // Start/stop work as `el` enters/leaves the viewport (and when the tab is hidden).
  function whileVisible(el, start, stop) {
    let onScreen = false, running = false;
    const sync = () => {
      const want = onScreen && !document.hidden;
      if (want !== running) { running = want; (want ? start : stop)(); }
    };
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(el);
    document.addEventListener('visibilitychange', sync);
  }
  // setInterval that only ticks while `el` is visible.
  function visibleInterval(el, fn, ms) {
    let id = 0;
    whileVisible(el, () => { id = setInterval(fn, ms); }, () => clearInterval(id));
  }

  /* ---------- nav + scroll progress ---------- */
  const nav = $('.nav');
  const bar = $('.scroll-progress');
  let scrollQueued = false;
  const onScroll = () => {
    scrollQueued = false;
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    bar.style.transform = `scaleX(${p})`;
    nav.classList.toggle('scrolled', h.scrollTop > 30);
    catchUpReveals();
  };
  addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  const toggle = $('.nav-toggle');
  const links = $('#navLinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('a', links).forEach((a) => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- "Get the app": go straight to the right store on phones ---------- */
  const ua = navigator.userAgent;
  const store = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    ? 'https://apps.apple.com/in/app/tryb-social-games/id6759920055'
    : /Android/.test(ua) ? 'https://play.google.com/store/apps/details?id=com.trybsocial.ludo' : null;
  if (store) Object.assign($('#getApp'), { href: store, target: '_blank', rel: 'noopener' });

  /* ---------- cursor glow + magnetic buttons ---------- */
  if (finePointer && !reduce) {
    const glow = $('.cursor-glow');
    addEventListener('pointermove', (e) => {
      glow.style.opacity = 1;
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    }, { passive: true });

    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', (e.clientX - r.left - r.width / 2) * 0.25 + 'px');
        b.style.setProperty('--my', (e.clientY - r.top - r.height / 2) * 0.35 + 'px');
      });
      b.addEventListener('pointerleave', () => {
        b.style.setProperty('--mx', '0px');
        b.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---------- scramble text ---------- */
  const GLYPHS = '!<>-_\\/[]{}—=+*^?#01ABCDEFX';
  function scramble(el) {
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    if (reduce) { el.textContent = final; return; }
    // Lock the box: wide glyphs would otherwise rewrap and jump the layout (worst on phones).
    el.style.height = el.offsetHeight + 'px';
    el.style.overflow = 'hidden';
    let frame = 0;
    const total = 28;
    const finish = () => {
      frame = total + 1;
      el.textContent = final;
      el.style.height = el.style.overflow = '';
    };
    const tick = () => {
      if (frame > total) return;
      const progress = frame / total;
      el.textContent = [...final].map((ch, i) => {
        if (ch === ' ' || i / final.length < progress) return ch;
        return GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }).join('');
      if (frame++ < total) requestAnimationFrame(tick);
      else finish();
    };
    tick();
    setTimeout(finish, 1500); // rAF can stall in background tabs
  }

  /* ---------- reveal on scroll ---------- */
  const pendingReveals = new Set();
  const reveal = (el) => {
    if (!pendingReveals.delete(el)) return;
    el.classList.add('in');
    $$('[data-scramble]', el).forEach(scramble);
    if (el.matches('[data-scramble]')) scramble(el);
    revealIO.unobserve(el);
  };
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) reveal(e.target); });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  function catchUpReveals() {
    if (!pendingReveals.size) return;
    const vh = innerHeight;
    pendingReveals.forEach((el) => { if (el.getBoundingClientRect().top < vh) reveal(el); });
  }
  $$('.reveal').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 6) * 0.08 + 's');
    pendingReveals.add(el);
    revealIO.observe(el);
  });
  onScroll();

  /* ---------- rotating hero word ---------- */
  const rot = $('.rotator');
  const words = ['Tryb.', 'squad.', 'rivals.', 'campus.', 'people.'];
  let wi = 0;
  if (!reduce) {
    visibleInterval(rot, () => {
      wi = (wi + 1) % words.length;
      rot.classList.remove('glitching');
      void rot.offsetWidth;
      rot.dataset.text = words[wi];
      rot.classList.add('glitching');
      setTimeout(() => { rot.textContent = words[wi]; }, 120);
    }, 2600);
  }

  /* final CTA glitches periodically */
  const finalH = $('.final .glitch');
  if (!reduce) visibleInterval(finalH, () => {
    finalH.classList.remove('glitching'); void finalH.offsetWidth; finalH.classList.add('glitching');
  }, 3800);

  /* ---------- particle constellation ---------- */
  const canvas = $('#constellation');
  const ctx = canvas.getContext('2d');
  const COLORS = ['#A259FF', '#22D3EE', '#E50695', '#3B82F6', '#FF8A3D'];
  const LINK = 130, LINK2 = LINK * LINK, PULL = 180, PULL2 = PULL * PULL;
  let W = 0, H = 0, nodes = [], running = false, frame = 0, rafId = 0, mouse = { x: -9999, y: -9999 };

  // Pre-rendered glow dots: drawImage is far cheaper than shadowBlur on every node, every frame.
  const SPRITE = 32;
  const sprites = Object.fromEntries(COLORS.map((c) => {
    const s = document.createElement('canvas');
    s.width = s.height = SPRITE;
    const g = s.getContext('2d'), m = SPRITE / 2;
    const grad = g.createRadialGradient(m, m, 0, m, m, m);
    grad.addColorStop(0, c); grad.addColorStop(0.22, c); grad.addColorStop(0.3, c + '66'); grad.addColorStop(1, c + '00');
    g.fillStyle = grad; g.fillRect(0, 0, SPRITE, SPRITE);
    return [c, s];
  }));

  function sizeCanvas() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    // Phones fire resize when the URL bar slides; only rebuild when the size really changed.
    if (w === W && Math.abs(h - H) < 120) return false;
    W = w; H = h;
    const DPR = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.round(coarse
      ? Math.min(45, Math.max(18, (W * H) / 16000))
      : Math.min(100, Math.max(40, (W * H) / 14000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.8,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    }));
    return true;
  }

  function draw() {
    if (running && !reduce) rafId = requestAnimationFrame(draw);
    if (coarse && (frame++ & 1)) return; // 30fps is plenty for a slow drift on phones
    ctx.clearRect(0, 0, W, H);
    const step = coarse ? 2 : 1;
    for (const n of nodes) {
      if (reduce) break;
      const dx = mouse.x - n.x, dy = mouse.y - n.y, d2 = dx * dx + dy * dy;
      if (d2 < PULL2) { const d = Math.sqrt(d2) || 1; n.vx += dx / d * 0.012; n.vy += dy / d * 0.012; }
      n.vx *= 0.99; n.vy *= 0.99;
      n.x += (n.vx + (Math.random() - 0.5) * 0.05) * step;
      n.y += (n.vy + (Math.random() - 0.5) * 0.05) * step;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    }
    ctx.lineWidth = 0.7;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < LINK2) {
          ctx.strokeStyle = a.c;
          ctx.globalAlpha = (1 - Math.sqrt(d2) / LINK) * 0.35;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const mx = a.x - mouse.x, my = a.y - mouse.y, md2 = mx * mx + my * my;
      if (md2 < PULL2) {
        ctx.strokeStyle = '#22D3EE';
        ctx.globalAlpha = (1 - Math.sqrt(md2) / PULL) * 0.6;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (const n of nodes) {
      const size = n.r * 9;
      ctx.drawImage(sprites[n.c], n.x - size / 2, n.y - size / 2, size, size);
    }
  }

  sizeCanvas();
  draw();
  let resizeT;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (sizeCanvas() && !running) draw(); }, 150);
  });
  const hero = $('.hero');
  if (finePointer) {
    hero.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  }
  whileVisible(hero, () => { running = true; cancelAnimationFrame(rafId); draw(); }, () => { running = false; cancelAnimationFrame(rafId); });

  /* ---------- inbox swipe deck ---------- */
  const DECK = [
    { c: '#A259FF', ico: '🎲', kind: 'Game invite', t: 'Riya invited you to Ludo', p: 'Hostel B · 3 of 4 seats taken', m: ['starts in 0:30', 'real-time'] },
    { c: '#FFD700', ico: '🏆', kind: 'Result', t: 'You beat Arjun at Wordle', p: 'Solved in 3/6 — he took 5.', m: ['+120 XP', 'rematch?'] },
    { c: '#22D3EE', ico: '👋', kind: 'Friend request', t: 'Kabir wants to connect', p: 'You played Mafia together last night.', m: ['2 mutual Trybs'] },
    { c: '#EF4444', ico: '🕵️', kind: 'Challenge', t: "Mafia night in CSE '27", p: 'Someone here is lying. Is it you?', m: ['6/8 joined', 'party'] },
    { c: '#22C55E', ico: '🗳️', kind: 'Campus', t: 'Hostel election closes tonight', p: 'Your vote decides the fest theme.', m: ['412 votes', 'ends 11pm'] },
    { c: '#E50695', ico: '✨', kind: 'Creator Studio', t: '"Canteen Chaos" just dropped', p: 'Meera from Mech described it in one sentence.', m: ['made on Tryb', 'play now'] },
  ];
  const deckEl = $('#deck');
  const yesBtn = $('.act.yes'), noBtn = $('.act.no');
  let di = 0;
  const makeCard = (d) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.setProperty('--c', d.c);
    el.innerHTML = `<span class="stamp yes">JOIN</span><span class="stamp no">NOPE</span>
      <div class="c-ico">${d.ico}</div><div class="c-kind">${d.kind}</div>
      <h4>${d.t}</h4><p>${d.p}</p>
      <div class="c-meta">${d.m.map((x) => `<span>${x}</span>`).join('')}</div>`;
    return el;
  };
  const layout = () => $$('.card:not(.out-left):not(.out-right)', deckEl).forEach((c, i) => c.dataset.pos = i);
  for (let i = 0; i < 3; i++) deckEl.appendChild(makeCard(DECK[i]));
  di = 3;
  layout();
  if (!reduce) {
    let swipeRight = true;
    visibleInterval(deckEl, () => {
      const top = $('.card[data-pos="0"]', deckEl);
      if (!top) return;
      const btn = swipeRight ? yesBtn : noBtn;
      btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 300);
      top.classList.add(swipeRight ? 'out-right' : 'out-left');
      top.removeAttribute('data-pos');
      setTimeout(() => top.remove(), 650);
      const next = makeCard(DECK[di++ % DECK.length]);
      next.dataset.pos = 3; next.style.opacity = 0;
      deckEl.appendChild(next);
      requestAnimationFrame(() => { next.style.opacity = ''; layout(); });
      swipeRight = Math.random() > 0.3;
    }, 2400);
  }

  /* ---------- 3D tilt cards ---------- */
  if (finePointer && !reduce) {
    $$('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', (x - 0.5) * 16 + 'deg');
        card.style.setProperty('--rx', (0.5 - y) * 16 + 'deg');
        card.style.setProperty('--gx', x * 100 + '%');
        card.style.setProperty('--gy', y * 100 + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Creator Studio terminal ---------- */
  const term = $('#term');
  const termBar = $('#termBar');
  const IDEAS = [
    { idea: 'a quiz where my hostel guesses who said which quote', name: 'Who Said It? — Hostel Edition', ico: '💬' },
    { idea: 'flappy bird but you dodge attendance shortages', name: 'Attendance Escape', ico: '🐦' },
    { idea: 'a trivia race about our college fest history', name: 'Fest Frenzy', ico: '🎪' },
  ];
  const STEPS = ['reading your idea', 'designing the rules', 'generating art & sound', 'wiring up multiplayer', 'play-testing'];
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  let termVisible = false, resumeTerm = null;
  const termReady = () => termVisible ? null : new Promise((r) => { resumeTerm = r; });
  const pause = async (ms) => { await sleep(ms); await termReady(); };
  async function typeInto(node, text, speed = 28) {
    for (const ch of text) { node.textContent += ch; await sleep(speed + Math.random() * 30); }
  }
  async function runTerminal() {
    let k = 0;
    while (true) {
      const { idea, name, ico } = IDEAS[k++ % IDEAS.length];
      term.innerHTML = '<span class="dim"># describe your game in plain words</span>\n<span class="p">tryb ›</span> <span class="q"></span><span class="caret"></span>';
      termBar.style.width = '0%';
      await typeInto($('.q', term), '"' + idea + '"');
      await pause(500);
      $('.caret', term).remove();
      for (let i = 0; i < STEPS.length; i++) {
        const line = document.createElement('div');
        line.innerHTML = `<span class="dim">[${String(i + 1).padStart(2, '0')}]</span> ${STEPS[i]}<span class="dots"></span>`;
        term.appendChild(line);
        const dots = $('.dots', line);
        for (let d = 0; d < 3; d++) { dots.textContent += '.'; await pause(180); }
        dots.insertAdjacentHTML('afterend', ' <span class="ok">✓</span>');
        termBar.style.width = ((i + 1) / STEPS.length) * 100 + '%';
      }
      term.insertAdjacentHTML('beforeend', `<span class="ship">${ico} <b>${esc(name)}</b> is ready.\n<span class="dim">▸ play it · ▸ share to campus</span></span>`);
      await pause(3800);
    }
  }
  if (reduce) {
    term.innerHTML = `<span class="p">tryb ›</span> <span class="q">"${esc(IDEAS[0].idea)}"</span>\n` +
      STEPS.map((s, i) => `<span class="dim">[0${i + 1}]</span> ${s}... <span class="ok">✓</span>`).join('\n') +
      `<span class="ship">${IDEAS[0].ico} <b>${esc(IDEAS[0].name)}</b> is ready.</span>`;
    termBar.style.width = '100%';
  } else {
    let started = false;
    whileVisible(term, () => {
      termVisible = true;
      if (resumeTerm) { resumeTerm(); resumeTerm = null; }
      if (!started) { started = true; runTerminal(); }
    }, () => { termVisible = false; });
  }

  /* ---------- Dept Wars leaderboard (sample data) ---------- */
  const board = $('#board');
  const DEPTS = [
    { n: 'CSE', c: '#A259FF', p: 2480 },
    { n: 'MECH', c: '#22D3EE', p: 2315 },
    { n: 'EE', c: '#FF8A3D', p: 2190 },
    { n: 'CIVIL', c: '#22C55E', p: 1960 },
    { n: 'BIO', c: '#E50695', p: 1840 },
  ];
  const ROW_H = () => board.firstElementChild ? board.firstElementChild.offsetHeight : 44;
  DEPTS.forEach((d) => {
    const li = document.createElement('li');
    li.style.setProperty('--c', d.c);
    li.innerHTML = `<span class="rank"></span><b>${d.n}</b><span class="bar"><span></span></span><span class="pts"></span>`;
    d.el = li;
    board.appendChild(li);
  });
  function renderBoard(bumped) {
    const sorted = [...DEPTS].sort((a, b) => b.p - a.p);
    const max = sorted[0].p, h = ROW_H();
    sorted.forEach((d, i) => {
      const domIndex = DEPTS.indexOf(d);
      d.el.style.transform = `translateY(${(i - domIndex) * h}px)`;
      $('.rank', d.el).textContent = String(i + 1).padStart(2, '0');
      $('.bar span', d.el).style.width = (d.p / max) * 100 + '%';
      const pts = $('.pts', d.el);
      pts.textContent = d.p.toLocaleString('en-IN');
      pts.classList.toggle('bump', d === bumped);
    });
  }
  renderBoard();
  if (!reduce) {
    visibleInterval(board, () => {
      const d = DEPTS[(Math.random() * DEPTS.length) | 0];
      d.p += 40 + ((Math.random() * 160) | 0);
      renderBoard(d);
    }, 2200);
  }

  /* ---------- counters ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || '';
      if (reduce || to === 0) { el.textContent = to + suf; return; }
      const t0 = performance.now(), dur = 1400;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));
})();

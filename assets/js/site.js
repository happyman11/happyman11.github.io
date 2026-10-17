/* ==========================================================================
   Ravi Shekhar Tiwari — portfolio interactions
   Vanilla JS, no dependencies. Every feature checks for its markup first,
   so this file is shared by index.html and Core-CSE-Conference.html.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  // Respect "Data Saver" / "Lite mode": draw the canvas once instead of animating it.
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ } },
  };

  // Run fn at most once per animation frame.
  const rafThrottle = (fn) => {
    let queued = false;
    return (...args) => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fn(...args); });
    };
  };

  const debounce = (fn, wait) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  /* ---------- Theme ---------- */
  function initTheme() {
    $$('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const root = document.documentElement;
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        root.dataset.theme = next;
        store.set('theme', next);
        btn.setAttribute('aria-label', next === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
        document.dispatchEvent(new CustomEvent('themechange'));
      });
    });
  }

  /* ---------- Navigation, progress bar, back-to-top ---------- */
  function initNav() {
    const nav = $('.site-nav');
    if (!nav) return;
    const toggle = $('.nav-toggle', nav);
    const progress = $('.scroll-progress');
    const toTop = $('.to-top');

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      if (toggle) {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }
    };
    toggle?.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    $$('.nav-links a', nav).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target)) setOpen(false);
    });

    const onScroll = rafThrottle(() => {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 24);
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
      toTop?.classList.toggle('is-visible', y > window.innerHeight * 0.9);
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // In-page links: sections render on demand (content-visibility), so their real heights can
    // change while a smooth scroll is in flight. Once scrolling settles, nudge to the exact target.
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      const id = a && decodeURIComponent(a.getAttribute('href').slice(1));
      const target = id && document.getElementById(id);
      if (!target) return;
      let lastY = -1;
      let still = 0;
      let corrections = 0;
      const started = performance.now();
      const watch = () => {
        const y = window.scrollY;
        still = y === lastY ? still + 1 : 0;
        lastY = y;
        if (still < 8 && performance.now() - started < 3000) { requestAnimationFrame(watch); return; }
        const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        const delta = target.getBoundingClientRect().top - pad;
        if (Math.abs(delta) > 4 && corrections < 2) {
          corrections += 1;
          const root = document.documentElement;
          const prev = root.style.scrollBehavior;
          root.style.scrollBehavior = 'auto';
          window.scrollBy(0, delta);
          root.style.scrollBehavior = prev;
          still = 0;
          requestAnimationFrame(watch);
        }
      };
      requestAnimationFrame(watch);
    });

    // Scrollspy: highlight the link whose section crosses the upper-middle band of the viewport.
    // Sections without a nav link (hero, education…) clear the highlight.
    const links = $$('.nav-links a[href^="#"]', nav);
    const map = new Map();
    links.forEach((a) => {
      const section = document.getElementById(a.getAttribute('href').slice(1));
      if (section) map.set(section, a);
    });
    if (!map.size || !('IntersectionObserver' in window)) return;
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        map.get(entry.target)?.classList.add('is-active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach((section) => spy.observe(section));
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    // Stagger children of [data-stagger] containers.
    $$('[data-stagger]').forEach((group) => {
      const step = parseFloat(group.dataset.stagger) || 0.07;
      $$(':scope > [data-reveal], :scope > * > [data-reveal]', group).forEach((el, i) => {
        el.style.setProperty('--d', `${Math.min(i * step, 0.6).toFixed(2)}s`);
      });
    });

    const els = $$('[data-reveal]');
    const finish = (el) => {
      el.classList.add('is-in');
      if (reducedMotion.matches) { el.removeAttribute('data-reveal'); return; }
      // Drop the reveal hook after the entrance so hover transitions aren't delayed.
      // --d is always set inline, so read it from el.style (no forced style recalc).
      const delay = parseFloat(el.style.getPropertyValue('--d')) || 0;
      setTimeout(() => {
        el.removeAttribute('data-reveal');
        el.style.removeProperty('--d');
      }, 950 + delay * 1000);
    };

    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      els.forEach(finish);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        finish(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Count-up numbers ---------- */
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const fmt = new Intl.NumberFormat('en-IN');
    const run = (el) => {
      const end = Number(el.dataset.count);
      const duration = 1800;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        el.textContent = fmt.format(Math.round(end * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return; // final values are already in the markup
    els.forEach((el) => { el.textContent = '0'; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Typed role rotator ---------- */
  function initTyped() {
    const el = $('[data-typed]');
    if (!el) return;
    let words;
    try { words = JSON.parse(el.dataset.typed); } catch (e) { return; }
    if (!words.length) return;
    if (reducedMotion.matches) { el.textContent = words[0]; return; }

    let w = 0;
    let i = 0;
    let deleting = false;
    const tick = () => {
      const word = words[w];
      i += deleting ? -1 : 1;
      el.textContent = word.slice(0, i);
      let delay = deleting ? 38 : 70 + Math.random() * 50;
      if (!deleting && i === word.length) { deleting = true; delay = 1900; }
      else if (deleting && i === 0) { deleting = false; w = (w + 1) % words.length; delay = 380; }
      setTimeout(tick, delay);
    };
    el.textContent = '';
    setTimeout(tick, 900);
  }

  /* ---------- Neural constellation canvas ---------- */
  class Constellation {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.density = parseFloat(canvas.dataset.density) || 1;
      this.nodes = [];
      this.pointer = { x: 0, y: 0, active: false };
      this.visible = true;
      this.running = false;
      this.loop = this.loop.bind(this);

      this.frameInterval = window.matchMedia('(pointer: coarse)').matches ? 1000 / 30 : 0;
      this.lastFrame = 0;

      this.readColors();
      this.resize();
      canvas.classList.add('is-ready');

      window.addEventListener('resize', debounce(() => this.resize(), 150));
      const host = canvas.parentElement;
      host.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        this.pointer.x = e.clientX - r.left;
        this.pointer.y = e.clientY - r.top;
        this.pointer.active = true;
      }, { passive: true });
      host.addEventListener('pointerleave', () => { this.pointer.active = false; });
      document.addEventListener('themechange', () => { this.readColors(); if (!this.running) this.draw(); });
      document.addEventListener('visibilitychange', () => this.update());
      reducedMotion.addEventListener?.('change', () => this.update());
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.update(); }).observe(canvas);
      }
      this.update();
    }

    readColors() {
      const cs = getComputedStyle(this.canvas);
      this.nodeRGB = cs.getPropertyValue('--node-rgb').trim() || '199, 210, 254';
      this.edgeRGB = cs.getPropertyValue('--edge-rgb').trim() || '139, 92, 246';
      this.sparkRGB = cs.getPropertyValue('--spark-rgb').trim() || '34, 211, 238';
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.w = rect.width;
      this.h = rect.height;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.linkDist = Math.max(90, Math.min(150, this.w / 9));

      const target = Math.round(Math.min(150, (this.w * this.h) / 13000) * this.density);
      while (this.nodes.length < target) this.nodes.push(this.makeNode());
      this.nodes.length = target;
      this.nodes.forEach((n) => { n.x = Math.min(n.x, this.w); n.y = Math.min(n.y, this.h); });
      if (!this.running) this.draw();
    }

    makeNode() {
      const speed = 0.12 + Math.random() * 0.22;
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * (this.w || 1),
        y: Math.random() * (this.h || 1),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1 + Math.random() * 1.6,
        // ~15% are "symbolic" nodes, drawn as diamonds — a nod to neurosymbolic AI
        symbolic: Math.random() < 0.15,
        phase: Math.random() * Math.PI * 2,
      };
    }

    update() {
      const shouldRun = this.visible && !document.hidden && !reducedMotion.matches && !saveData;
      if (shouldRun && !this.running) {
        this.running = true;
        this.last = performance.now();
        requestAnimationFrame(this.loop);
      } else if (!shouldRun) {
        this.running = false;
        this.draw();
      }
    }

    loop(now) {
      if (!this.running) return;
      requestAnimationFrame(this.loop);
      // Touch devices are capped at ~30fps to save battery; desktops run at display rate.
      if (this.frameInterval && now - this.lastFrame < this.frameInterval) return;
      this.lastFrame = now;
      const dt = Math.min(48, now - this.last) / 16.67;
      this.last = now;
      this.time = now / 1000;
      this.step(dt);
      this.draw();
    }

    step(dt) {
      const { w, h, pointer } = this;
      for (const n of this.nodes) {
        if (pointer.active) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 200 * 200 && d2 > 1) {
            n.vx += (dx / Math.sqrt(d2)) * 0.006 * dt;
            n.vy += (dy / Math.sqrt(d2)) * 0.006 * dt;
          }
        }
        const speed = Math.hypot(n.vx, n.vy);
        if (speed > 0.7) { n.vx *= 0.7 / speed; n.vy *= 0.7 / speed; }
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
      }
    }

    draw() {
      const { ctx, nodes, linkDist, pointer } = this;
      if (!this.w) return;
      ctx.clearRect(0, 0, this.w, this.h);
      const t = this.time || 0;
      const BANDS = Constellation.BANDS;

      // Edges: bucket by opacity so each band is a single path + a single stroke() call.
      const bands = this.bands || (this.bands = Array.from({ length: BANDS }, () => []));
      bands.forEach((b) => { b.length = 0; });
      const max2 = linkDist * linkDist;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > max2) continue;
          const k = Math.min(BANDS - 1, Math.floor((1 - Math.sqrt(d2) / linkDist) * BANDS));
          bands[k].push(a.x, a.y, b.x, b.y);
        }
      }
      ctx.lineWidth = 0.8;
      for (let k = 0; k < BANDS; k++) {
        const seg = bands[k];
        if (!seg.length) continue;
        ctx.strokeStyle = `rgba(${this.edgeRGB}, ${(((k + 0.5) / BANDS) * 0.42).toFixed(3)})`;
        ctx.beginPath();
        for (let i = 0; i < seg.length; i += 4) { ctx.moveTo(seg[i], seg[i + 1]); ctx.lineTo(seg[i + 2], seg[i + 3]); }
        ctx.stroke();
      }

      if (pointer.active && this.running) {
        const reach = linkDist * 1.4;
        ctx.strokeStyle = `rgba(${this.sparkRGB}, 0.35)`;
        ctx.beginPath();
        for (const n of nodes) {
          if (Math.hypot(pointer.x - n.x, pointer.y - n.y) > reach) continue;
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(n.x, n.y);
        }
        ctx.stroke();
        ctx.fillStyle = `rgba(${this.sparkRGB}, 0.9)`;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Neural nodes: one path, one fill.
      ctx.fillStyle = `rgba(${this.nodeRGB}, 0.8)`;
      ctx.beginPath();
      for (const n of nodes) {
        if (n.symbolic) continue;
        ctx.moveTo(n.x + n.r, n.y);
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      }
      ctx.fill();

      // Symbolic nodes: pulsing diamonds (a nod to neurosymbolic AI).
      for (const n of nodes) {
        if (!n.symbolic) continue;
        const pulse = 0.6 + 0.4 * Math.sin(t * 1.6 + n.phase);
        const s = n.r + 2.2;
        ctx.fillStyle = `rgba(${this.sparkRGB}, ${(0.12 * pulse).toFixed(3)})`;
        this.diamond(n.x, n.y, s * 3.1);
        ctx.fillStyle = `rgba(${this.sparkRGB}, ${(0.55 + 0.4 * pulse).toFixed(3)})`;
        this.diamond(n.x, n.y, s * 0.71);
      }
    }

    diamond(x, y, r) {
      const { ctx } = this;
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  Constellation.BANDS = 6;

  // Decorative, so it starts once the browser is idle and never competes with first paint.
  const whenIdle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));

  function initConstellations() {
    const canvases = $$('canvas[data-constellation]');
    if (!canvases.length) return;
    whenIdle(() => canvases.forEach((c) => { if (c.getContext) new Constellation(c); }));
  }

  /* ---------- Card spotlight + tilt ---------- */
  function initSpotlight() {
    if (!canHover.matches) return;
    $$('[data-spotlight]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }, { passive: true });
    });

    if (reducedMotion.matches) return;
    $$('[data-tilt]').forEach((card) => {
      const max = parseFloat(card.dataset.tilt) || 6;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
      }, { passive: true });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- Timeline progress ---------- */
  const updateTimelines = () => {
    const vh = window.innerHeight;
    const reads = $$('.timeline').map((tl) => [tl, tl.getBoundingClientRect()]);
    reads.forEach(([tl, r]) => {
      if (!r.height) return; // inside a hidden tab panel
      const p = Math.min(1, Math.max(0, (vh * 0.65 - r.top) / r.height));
      tl.style.setProperty('--progress', p.toFixed(4));
    });
  };
  function initTimelines() {
    const first = $('.timeline');
    if (!first) return;
    // Measuring a section that is skipped by content-visibility would force it to render,
    // so progress is only computed while the section is near the viewport.
    let near = !('IntersectionObserver' in window);
    const onScroll = rafThrottle(() => { if (near) updateTimelines(); });
    if (!near) {
      new IntersectionObserver(([entry]) => {
        near = entry.isIntersecting;
        if (near) updateTimelines();
      }, { rootMargin: '200px 0px' }).observe(first.closest('section') || first);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    $$('[role="tablist"]').forEach((list) => {
      const tabs = $$('[role="tab"]', list);
      const indicator = $('.tab-indicator', list);

      const moveIndicator = () => {
        const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
        if (!indicator || !active) return;
        indicator.style.width = `${active.offsetWidth}px`;
        indicator.style.height = `${active.offsetHeight}px`;
        indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
      };

      const select = (tab, focus, measure = true) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus();
        if (!measure) return;
        moveIndicator();
        updateTimelines();
      };

      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(tab, false));
        tab.addEventListener('keydown', (e) => {
          let next = null;
          if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
          else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === 'Home') next = tabs[0];
          else if (e.key === 'End') next = tabs[tabs.length - 1];
          if (next) { e.preventDefault(); select(next, true); }
        });
      });

      // Panels ship visible so the content is readable without JS; hide the inactive ones now.
      select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0], false, false);
      let near = !('IntersectionObserver' in window);
      const measure = () => { if (near) moveIndicator(); };
      if (near) requestAnimationFrame(moveIndicator);
      else {
        new IntersectionObserver(([entry]) => {
          near = entry.isIntersecting;
          if (near) moveIndicator();
        }, { rootMargin: '200px 0px' }).observe(list);
      }
      window.addEventListener('resize', debounce(measure, 100));
      if (document.fonts?.ready) document.fonts.ready.then(measure);
    });
  }

  /* ---------- Project filter ---------- */
  function initFilter() {
    $$('[data-filter-bar]').forEach((bar) => {
      const grid = document.getElementById(bar.dataset.filterBar);
      if (!grid) return;
      const items = $$('[data-cat]', grid);
      const buttons = $$('[data-filter]', bar);

      buttons.forEach((btn) => {
        const f = btn.dataset.filter;
        const n = f === 'all' ? items.length : items.filter((it) => it.dataset.cat === f).length;
        const badge = document.createElement('span');
        badge.className = 'count';
        badge.textContent = n;
        btn.appendChild(badge);
      });

      bar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        const f = btn.dataset.filter;
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        items.forEach((it) => {
          const show = f === 'all' || it.dataset.cat === f;
          if (show) {
            it.hidden = false;
            requestAnimationFrame(() => requestAnimationFrame(() => it.classList.remove('is-filtered-out')));
          } else {
            it.classList.add('is-filtered-out');
            const hide = () => { if (it.classList.contains('is-filtered-out')) it.hidden = true; };
            if (reducedMotion.matches) hide(); else setTimeout(hide, 300);
          }
        });
      });
    });
  }

  /* ---------- Marquee (duplicate content for a seamless loop) ---------- */
  function initMarquee() {
    $$('.marquee-track').forEach((track) => {
      $$(':scope > li', track).forEach((li) => {
        const clone = li.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
    });
  }

  /* ---------- Copy email ---------- */
  function initCopy() {
    $$('[data-copy]').forEach((btn) => {
      const label = $('.copy-label', btn);
      const original = label?.textContent;
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
          if (label) label.textContent = 'Copied!';
        } catch (e) {
          if (label) label.textContent = btn.dataset.copy;
        }
        setTimeout(() => { if (label) label.textContent = original; }, 2000);
      });
    });
  }

  /* ---------- Pause off-screen animations ---------- */
  function initOffscreenPause() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting));
    }, { rootMargin: '100px 0px' });
    $$('main > section, main > header, .site-footer').forEach((el) => io.observe(el));
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMarquee();
    initFilter();
    initTabs();
    initCounters();
    initReveal();
    initTyped();
    initNav();
    initSpotlight();
    initTimelines();
    initCopy();
    initOffscreenPause();
    initConstellations();
  });
})();

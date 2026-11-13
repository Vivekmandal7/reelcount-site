/*
 * reelcount.livomind.com — small, dependency-free enhancements.
 * Every page reads fine without this file; it only adds motion and the demos.
 *
 * Rotly's rules are the app's own (data/DayCounts.kt): the state is the share of the
 * daily limit, under a quarter fresh, under three quarters fading, under one and a
 * half rotting, and gone beyond that.
 */
(function () {
  'use strict';

  var LIMIT = 100;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STATES = {
    fresh: { word: 'Fresh', sentence: 'Rotly is fresh', says: 'Feeling fresh!', alt: 'Rotly, bright green and smiling' },
    fading: { word: 'Fading', sentence: 'Rotly is fading', says: 'Getting a little sleepy…', alt: 'Rotly, pale yellow and sleepy' },
    rotting: { word: 'Rotting', sentence: 'Rotly is rotting', says: 'Help, I’m melting!', alt: 'Rotly, melting and orange' },
    gone: { word: 'Gone', sentence: 'Rotly is gone', says: 'Puddle mode. Tomorrow’s a fresh start.', alt: 'Rotly as a grey puddle' }
  };

  function stateFor(count, limit) {
    var f = limit <= 0 ? 0 : count / limit;
    if (f < 0.25) return 'fresh';
    if (f < 0.75) return 'fading';
    if (f < 1.5) return 'rotting';
    return 'gone';
  }

  function reels(n) { return n + (n === 1 ? ' reel' : ' reels'); }

  function leftLine(count, limit) {
    if (count < limit) return reels(limit - count) + ' left before your limit';
    if (count === limit) return 'You’ve reached your limit for today';
    return reels(count - limit) + ' over your limit today';
  }

  function art(base, state) { return base + 'assets/img/rotly/' + state + '.webp'; }

  // Pages in folders reach assets one level up; read it from the stylesheet link.
  var cssLink = document.querySelector('link[href$="assets/css/site.css"]');
  var BASE = cssLink ? cssLink.getAttribute('href').replace('assets/css/site.css', '') : '';

  // Preload the four faces so swapping states never flashes an empty frame.
  ['fresh', 'fading', 'rotting', 'gone'].forEach(function (s) { var i = new Image(); i.src = art(BASE, s); });

  /* ---------- Menu ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); toggle.focus();
      }
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Chip (the floating counter) ---------- */
  function setChip(chip, count) {
    var state = stateFor(count, LIMIT);
    var label = chip.querySelector('b');
    var img = chip.querySelector('img');
    label.textContent = String(count);
    if (chip.getAttribute('data-state') !== state) {
      chip.setAttribute('data-state', state);
      img.src = art(BASE, state);
    }
    if (!reduceMotion) {
      chip.classList.remove('bump');
      void chip.offsetWidth; // restart the animation
      chip.classList.add('bump');
    }
  }

  /* ---------- Hero feed: reels slide past, the counter ticks ---------- */
  var feedPhone = document.querySelector('[data-feed]');
  if (feedPhone && !reduceMotion) {
    var feed = feedPhone.querySelector('.feed');
    var chip = feedPhone.querySelector('[data-chip]');
    var count = parseInt(chip.querySelector('b').textContent, 10) || 0;
    var timer = null;
    var busy = false;

    var advance = function () {
      if (busy || document.hidden) return;
      busy = true;
      feed.classList.add('is-moving');
      feed.style.transform = 'translateY(-100%)';
      var settled = false;
      var done = function () {
        if (settled) return;
        settled = true;
        feed.classList.remove('is-moving');
        feed.appendChild(feed.firstElementChild);
        feed.style.transform = 'translateY(0)';
        // Like the app: a reel counts once it has held still for a moment.
        setTimeout(function () { count += 1; setChip(chip, count); busy = false; }, 450);
      };
      feed.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 900); // in case transitionend never fires
    };

    var start = function () { if (!timer) timer = setInterval(advance, 2600); };
    var stop = function () { clearInterval(timer); timer = null; };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) start(); else stop(); });
      }, { threshold: 0.35 }).observe(feedPhone);
    } else {
      start();
    }
  }

  /* ---------- Rotly demo: slider drives the home card ---------- */
  var tryBox = document.querySelector('[data-try]');
  var home = document.querySelector('[data-home]');
  if (tryBox && home) {
    var range = tryBox.querySelector('[data-range]');
    var out = tryBox.querySelector('[data-out]');
    var live = tryBox.querySelector('[data-live]');
    var legendBtns = tryBox.querySelectorAll('.legend-btn');
    var bar = home.querySelector('[data-bar]');
    var rotly = home.querySelector('[data-rotly]');
    var num = home.querySelector('[data-count]');
    var sentence = home.querySelector('[data-sentence]');
    var left = home.querySelector('[data-left]');
    var says = home.querySelector('[data-says]');
    var lastState = home.getAttribute('data-state');
    var max = parseInt(range.max, 10);

    var render = function (count, announce) {
      count = Math.max(0, Math.min(max, count));
      var state = stateFor(count, LIMIT);
      var s = STATES[state];
      range.value = String(count);
      range.style.setProperty('--pct', (count / max * 100) + '%');
      out.textContent = String(count);
      num.textContent = String(count);
      left.textContent = leftLine(count, LIMIT);
      var pct = Math.min(count / LIMIT, 1) * 100;
      bar.setAttribute('stroke-dashoffset', String(100 - pct));
      bar.style.opacity = count === 0 ? '0' : '1';
      range.setAttribute('aria-valuetext', reels(count) + '. ' + s.sentence + '.');
      legendBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-key') === state)); });
      if (state !== lastState) {
        home.setAttribute('data-state', state);
        tryBox.setAttribute('data-state', state);
        rotly.src = art(BASE, state);
        rotly.alt = s.alt;
        sentence.textContent = s.sentence;
        says.textContent = '“' + s.says + '”';
        if (announce && live) live.textContent = s.sentence + '. ' + s.says;
        if (!reduceMotion) {
          rotly.animate && rotly.animate(
            [{ transform: 'scale(.86)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
            { duration: 420, easing: 'cubic-bezier(.3,1.4,.5,1)' }
          );
        }
        lastState = state;
      }
    };

    range.addEventListener('input', function () { render(parseInt(range.value, 10), true); });
    tryBox.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () { render(parseInt(range.value, 10) + parseInt(b.getAttribute('data-add'), 10), true); });
    });
    var reset = tryBox.querySelector('[data-reset]');
    if (reset) reset.addEventListener('click', function () { render(0, true); });
    legendBtns.forEach(function (b) {
      b.addEventListener('click', function () { render(parseInt(b.getAttribute('data-jump'), 10), true); });
    });

    tryBox.setAttribute('data-state', lastState);
    render(parseInt(range.value, 10), false);
  }

  /* ---------- Greeting and date, as the app's home screen shows them ---------- */
  var greet = document.querySelector('[data-greet]');
  var dateEl = document.querySelector('[data-date]');
  if (greet || dateEl) {
    var now = new Date();
    var h = now.getHours();
    if (greet) greet.textContent = h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : h >= 17 && h < 22 ? 'Good evening' : 'Still up?';
    if (dateEl) {
      try {
        var loc = (navigator.language || 'en-GB').toLowerCase().indexOf('en') === 0 ? navigator.language : 'en-GB';
        dateEl.textContent = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
      } catch (e) { /* keep the printed date */ }
    }
  }

  /* ---------- Limits demo ---------- */
  var limits = document.querySelector('[data-limits]');
  var blockPhone = document.querySelector('[data-block-phone]');
  if (limits && blockPhone) {
    var status = document.querySelector('[data-block-status]');
    var blockCount = blockPhone.querySelector('[data-block-count]');
    var blockSwitch = limits.querySelector('[data-toggle="block"]');
    var strictSwitch = limits.querySelector('[data-toggle="strict"]');

    var paint = function () {
      var block = blockSwitch.getAttribute('aria-checked') === 'true';
      var strict = strictSwitch.getAttribute('aria-checked') === 'true';
      blockPhone.setAttribute('data-block', block ? 'on' : 'off');
      blockPhone.setAttribute('data-strict', strict && block ? 'on' : 'off');
      limits.querySelector('[data-setting="block"]').classList.toggle('is-on', block);
      limits.querySelector('[data-setting="strict"]').classList.toggle('is-on', strict && block);
      strictSwitch.disabled = !block;
      blockCount.textContent = block ? '100' : '101';
      blockPhone.setAttribute('aria-label', block
        ? 'ReelCount’s block screen covering the reel player at 100 reels.'
        : 'A reel still playing at 101, with the counter showing Rotly rotting.');
      status.textContent = !block
        ? 'Blocking is off. The counter keeps counting and Rotly keeps melting, and that’s all.'
        : strict
          ? 'Strict mode: at your limit, reels are off for the rest of the day. No five-minute button.'
          : 'At your limit the reel player is covered. You can still take five more minutes.';
    };

    [blockSwitch, strictSwitch].forEach(function (sw) {
      sw.addEventListener('click', function () {
        if (sw.disabled) return;
        sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
        if (sw === blockSwitch && blockSwitch.getAttribute('aria-checked') === 'false') strictSwitch.setAttribute('aria-checked', 'false');
        paint();
      });
    });
    paint();
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      reveals.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    }
  }

  /* ---------- Document pages: highlight where you are in the contents ---------- */
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var visible = {};
    var sectionIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var first = null;
      tocLinks.forEach(function (a) { var id = a.getAttribute('href').slice(1); if (!first && visible[id]) first = id; });
      if (first) tocLinks.forEach(function (a) { a.classList.toggle('is-active', a === byId[first]); });
    }, { rootMargin: '-20% 0px -60% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) sectionIo.observe(s); });
    // On small screens the contents is a closed box; close it again after a jump.
    tocLinks.forEach(function (a) {
      a.addEventListener('click', function () {
        var d = a.closest('details');
        if (d && window.matchMedia('(max-width: 960px)').matches) d.open = false;
      });
    });
  }

  /* ---------- Help: filter questions as you type ---------- */
  var search = document.querySelector('[data-help-search]');
  if (search) {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-help] .qa'));
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-help] .help-group'));
    var none = document.querySelector('[data-no-results]');
    var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var texts = items.map(function (q) { return norm(q.textContent); });
    search.addEventListener('input', function () {
      var terms = norm(search.value.trim()).split(/\s+/).filter(Boolean);
      var shown = 0;
      items.forEach(function (q, i) {
        var hit = terms.every(function (t) { return texts[i].indexOf(t) !== -1; });
        q.hidden = !hit;
        if (hit) shown++;
        if (terms.length && hit && terms.join('').length > 2) q.open = true;
        if (!terms.length) q.open = false;
      });
      groups.forEach(function (g) { g.hidden = !g.querySelector('.qa:not([hidden])'); });
      if (none) none.classList.toggle('is-shown', shown === 0);
    });
    // Open a question linked to directly, e.g. help/#stopped
    var openHash = function () {
      var id = decodeURIComponent(location.hash.slice(1));
      var t = id && document.getElementById(id);
      if (t && t.tagName === 'DETAILS') t.open = true;
    };
    window.addEventListener('hashchange', openHash);
    openHash();
  }
})();

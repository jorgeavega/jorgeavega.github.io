// Jorge Vega portfolio: play the short screen animations, and a simple image viewer.
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Phone menu: the button opens and closes the links; tapping a link, tapping
  // outside the header or pressing Escape closes it again.
  var header = document.querySelector('.site-header');
  var toggle = header && header.querySelector('.menu-toggle');
  if (toggle) {
    var setMenu = function (open) {
      header.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', function () { setMenu(!header.classList.contains('open')); });
    header.querySelectorAll('nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('click', function (e) { if (!header.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('open')) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 721px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  // Short, silent screen animations play only while visible, and never when
  // the visitor has asked for reduced motion (they can still use the poster frame).
  var loops = document.querySelectorAll('video.autoplay');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          v.preload = 'auto';
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    loops.forEach(function (v) { io.observe(v); });
  }

  // Case-study cards: each case study starts closed (tag, title, summary and lead image).
  // EXPAND (or a click anywhere on the card) opens it; the same button, kept in view while
  // reading, turns into COLLAPSE. Links to a case study (e.g. the Selected work list) open it first.
  var kickPanels = function () {}; // set by the panel code below, to re-draw the panels while a card opens or closes
  var cards = Array.prototype.slice.call(document.querySelectorAll('.case.is-closed'));
  var cardEase = 'cubic-bezier(0.65, 0, 0.35, 1)';
  function cardState(c, open) {
    var btn = c.querySelector('.case-toggle'), body = c.querySelector('.case-body'), hero = c.querySelector('.hero-media .zoom');
    if (btn) { btn.setAttribute('aria-expanded', open ? 'true' : 'false'); btn.querySelector('.case-toggle__label').textContent = open ? 'Collapse' : 'Expand'; }
    if (body) { if (open) body.removeAttribute('inert'); else body.setAttribute('inert', ''); }
    if (hero) { if (open) hero.removeAttribute('tabindex'); else hero.setAttribute('tabindex', '-1'); } // closed: the button is the one control
  }
  // Moves the lead image smoothly from where it was to where the new layout puts it
  function moveHero(c, change, animate) {
    change(); return; // the lead image no longer moves between card and case study (the cover image animates instead)
    var z = c.querySelector('.hero-media .zoom');
    var a = z && z.getBoundingClientRect();
    change();
    if (!z || !animate || reduceMotion) return;
    var b = z.getBoundingClientRect();
    if (!a.width || !b.width) return;
    var dx = a.left - b.left, dy = a.top - b.top, sc = a.width / b.width;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sc - 1) < 0.01) return;
    z.style.transformOrigin = '0 0';
    z.style.transition = 'none';
    z.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + sc + ')';
    z.getBoundingClientRect(); // apply the starting point before animating to the new place
    z.style.transition = 'transform 0.7s ' + cardEase;
    z.style.transform = '';
    setTimeout(function () { z.style.transition = ''; z.style.transformOrigin = ''; }, 760);
  }
  function openCard(c, animate) {
    if (!c.classList.contains('is-closed')) return;
    // only one case study open at a time: any other open one closes first. If it sits above this
    // card, the page is corrected so this card stays exactly where the visitor clicked it.
    cards.forEach(function (o) {
      if (o === c || o.classList.contains('is-closed')) return;
      var before = o.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING;
      autoClose(o, before ? c : null);
    });
    var vr = c.getBoundingClientRect();
    c._seen = vr.bottom > window.innerHeight * 0.2 && vr.top < window.innerHeight * 0.8; // auto-collapse waits until the open case study has actually been on screen
    clearTimeout(c._closing); cancelAnimationFrame(c._raf); c.classList.remove('is-closing', 'is-closing-1', 'is-shrinking'); c.style.paddingBottom = ''; // reopened mid-close
    ['.case-body', '.case-head'].forEach(function (sel) { var el = c.querySelector(sel); if (el) { el.style.height = ''; el.style.overflow = ''; el.style.opacity = ''; el.style.paddingTop = ''; } });
    var mainEl = c.querySelector('.case-main'); if (mainEl) mainEl.style.paddingBottom = '';
    c.style.setProperty('--cover-h', c.getBoundingClientRect().height + 'px'); // the cover grows to fill the card at its closed size
    c.classList.add('is-visible'); // an open case study is never left faded out
    if (!animate) c.classList.add('no-anim');
    moveHero(c, function () { c.classList.remove('is-closed'); c.classList.add('is-open'); }, animate);
    cardState(c, true);
    clearTimeout(c._settle);
    if (animate && !reduceMotion) c._settle = setTimeout(function () { c.classList.add('is-settled'); }, 1020);
    else { c.classList.add('is-settled'); c.getBoundingClientRect(); c.classList.remove('no-anim'); }
    if (animate && !reduceMotion) setTimeout(kickPanels, 300); else kickPanels(); // the panel grows after the image burst
  }
  function closeCard(c) {
    if (c.classList.contains('is-closed')) return;
    clearTimeout(c._settle); clearTimeout(c._closing);
    var main = c.querySelector('.case-main'), body = c.querySelector('.case-body'), head = c.querySelector('.case-head');
    var animate = !reduceMotion && body && main && head;
    var cs = function (el, prop) { return getComputedStyle(el)[prop]; };
    // values while open, captured before the classes change
    var openPadCase = cs(c, 'paddingBottom'), openPadMain = cs(main, 'paddingBottom'), openPadHead = head ? cs(head, 'paddingTop') : '';
    var bodyRect = body ? body.getBoundingClientRect() : null;
    var startY = window.scrollY, cardTop = c.getBoundingClientRect().top;
    var targetY = cardTop < 90 ? startY + cardTop - (window.innerWidth <= 720 ? 96 : 110) : startY; // bring the card back into view if its top is off screen

    if (animate) { c.classList.add('no-anim', 'is-shrinking', 'is-closing', 'is-closing-1'); }
    else c.classList.add('no-anim');
    moveHero(c, function () { c.classList.remove('is-open', 'is-settled'); c.classList.add('is-closed'); }, false);
    stopVideos(c);
    cardState(c, false);
    // forget a link to this case study in the address bar, so reloading the page doesn't open it again
    var linked = null;
    try { linked = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (err) { linked = null; }
    if (linked && c.contains(linked)) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {}
    }

    if (!animate) {
      if (targetY !== startY) window.scrollTo({ top: targetY, behavior: 'instant' });
      c.getBoundingClientRect(); c.classList.remove('no-anim');
      kickPanels();
      return;
    }

    // Closing, step 1: the open case study shrinks smoothly back to the card. Anything below the bottom of
    // the window is trimmed first (it can't be seen), then the rest folds up while the page scrolls back to
    // the card, so the visitor sees one continuous movement instead of a jump.
    var closedPadCase = cs(c, 'paddingBottom'), closedPadMain = cs(main, 'paddingBottom'), closedPadHead = cs(head, 'paddingTop');
    var visible = Math.max(0, Math.min(bodyRect.height, window.innerHeight - bodyRect.top));
    var startH = (targetY !== startY) ? Math.min(bodyRect.height, visible + (startY - targetY)) : visible;
    c.style.paddingBottom = openPadCase; main.style.paddingBottom = openPadMain; head.style.paddingTop = openPadHead;
    body.style.overflow = 'hidden'; body.style.height = startH + 'px';
    c.getBoundingClientRect();
    c.classList.remove('no-anim');
    var dur = Math.min(1000, 600 + Math.abs(startY - targetY) * 0.15), t0 = performance.now(); // a little longer when it also scrolls back a long way
    var easeIO = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var pc0 = parseFloat(openPadCase), pc1 = parseFloat(closedPadCase), pm0 = parseFloat(openPadMain), pm1 = parseFloat(closedPadMain), ph0 = parseFloat(openPadHead), ph1 = parseFloat(closedPadHead);
    var step = function (now) {
      var t = Math.min(1, (now - t0) / dur), e = easeIO(t);
      body.style.height = (startH * (1 - e)) + 'px';
      body.style.opacity = String(1 - Math.min(1, t * 1.6));
      c.style.paddingBottom = (pc0 + (pc1 - pc0) * e) + 'px';
      main.style.paddingBottom = (pm0 + (pm1 - pm0) * e) + 'px';
      head.style.paddingTop = (ph0 + (ph1 - ph0) * e) + 'px'; // phones: room for the image strip opens as it shrinks
      if (targetY !== startY) window.scrollTo({ top: startY + (targetY - startY) * e, behavior: 'instant' });
      // the image starts sweeping back while the card is still finishing its shrink
      if (!imageGo && t >= 0.5) { imageGo = true; c.classList.remove('is-closing-1'); }
      if (t < 1) { c._raf = requestAnimationFrame(step); return; }
      // hand back to the stylesheet without any visible change (the image animation carries on)
      body.style.transition = 'none';
      c.classList.remove('is-shrinking');
      c.getBoundingClientRect();
      body.style.height = ''; body.style.overflow = ''; body.style.opacity = '';
      c.style.paddingBottom = ''; main.style.paddingBottom = ''; head.style.paddingTop = '';
      c.getBoundingClientRect();
      body.style.transition = '';
      c._closing = setTimeout(function () { c.classList.remove('is-closing'); }, 800);
    };
    var imageGo = false;
    cancelAnimationFrame(c._raf);
    c._raf = requestAnimationFrame(step);
    kickPanels();
  }

  // Auto-collapse: once an open case study has been on screen and then scrolls completely out of
  // view (above or below the window), it closes again. Closing one that is above the window would make
  // the page jump, so the scroll position is corrected to keep what the visitor is reading in place.
  function stopVideos(c) { c.querySelectorAll('.case-body video').forEach(function (v) { v.pause(); }); }
  function autoClose(c, keep) {
    if (c.classList.contains('is-closed')) return;
    var above = c.getBoundingClientRect().bottom <= window.innerHeight * 0.5;
    var anchor = keep || (above ? (c.nextElementSibling || document.body) : null); // the element that must not move on screen
    var before = anchor ? anchor.getBoundingClientRect().top : 0;
    c.classList.add('no-anim');
    clearTimeout(c._settle);
    c.classList.remove('is-open', 'is-settled', 'is-full');
    c.classList.add('is-closed');
    cardState(c, false);
    stopVideos(c);
    if (anchor) {
      var shift = anchor.getBoundingClientRect().top - before; // how far the content below moved up
      if (shift) window.scrollTo({ top: window.scrollY + shift, behavior: 'instant' });
    }
    c.getBoundingClientRect();
    c.classList.remove('no-anim');
    kickPanels();
  }
  var away = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var c = e.target;
      if (e.isIntersecting) { c._seen = true; return; }
      if (c._seen && c.classList.contains('is-open')) autoClose(c);
    });
  }, { threshold: 0, rootMargin: '-20% 0px -20% 0px' }) : null; // closes once the case study has left the middle 60% of the window

  // Same height for every card: measure each tag-and-title block without the shared minimum, then
  // give all of them the tallest one's height
  function equalCards() {
    var heads = cards.map(function (c) { return c.querySelector('.case-head > .wrap'); }).filter(Boolean);
    if (!heads.length) return;
    document.documentElement.style.setProperty('--case-head-h', '0px');
    var tallest = 0;
    heads.forEach(function (h) { tallest = Math.max(tallest, h.getBoundingClientRect().height); });
    document.documentElement.style.setProperty('--case-head-h', Math.ceil(tallest) + 'px');
  }
  equalCards();
  window.addEventListener('resize', equalCards);
  window.addEventListener('load', equalCards);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(equalCards);

  cards.forEach(function (c) {
    if (away) away.observe(c);
    cardState(c, false);
    var btn = c.querySelector('.case-toggle');
    if (btn) btn.addEventListener('click', function () {
      if (c.classList.contains('is-closed')) openCard(c, true); else { closeCard(c); btn.focus(); }
    });
    // a click anywhere on a closed card opens it (instead of opening the image viewer)
    c.addEventListener('click', function (e) {
      if (!c.classList.contains('is-closed') || e.target.closest('.case-toggle')) return;
      e.preventDefault(); e.stopPropagation();
      openCard(c, true);
    }, true);
  });
  function openFromHash(hash, animate) {
    if (!hash || hash.length < 2) return;
    var t = null;
    try { t = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (err) { t = null; }
    var c = t && t.closest('.case');
    if (c) openCard(c, animate);
  }
  function caseFor(hash) {
    var t = null;
    try { t = hash && hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1))); } catch (err) { t = null; }
    return t ? t.closest('.case') : null;
  }
  // A link to a case study (e.g. the Selected work list) opens it and scrolls to it, without adding
  // "#..." to the address bar, so reloading the page always starts with every case study closed.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var href = a.getAttribute('href'), c = caseFor(href);
    if (!c) return;
    e.preventDefault();
    openCard(c, false);
    var t = document.getElementById(decodeURIComponent(href.slice(1)));
    t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });
  window.addEventListener('hashchange', function () { openFromHash(location.hash, false); });
  // On (re)load every case study starts closed; an old "#case" left in the address bar is removed
  if (caseFor(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {} }

  // Case study panels: grow from a rounded card (as wide as the page content)
  // to the full window as a case study scrolls in, then shrink back near its end.
  var panels = document.querySelectorAll('.case');
  var ref = document.querySelector('#work .wrap');
  if (!reduceMotion && panels.length && ref && 'CSS' in window && CSS.supports('clip-path', 'inset(0 0 0 0 round 1px)')) {
    var edge = 0, radius = 12, ticking = false;
    var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var ease = function (t) { return t * t * (3 - 2 * t); }; // smooth start and finish

    var measure = function () {
      var r = ref.getBoundingClientRect();
      edge = r.left + parseFloat(getComputedStyle(ref).paddingLeft); // where page content starts
      // On phones the cards start as wide as the header pill, so the text inside keeps a margin
      var hdr = document.querySelector('.site-header');
      if (window.innerWidth <= 720 && hdr) edge = hdr.getBoundingClientRect().left;
      radius = 12; // corner radius of the case-study cards (px), on every screen size
      panels.forEach(function (el) { el.style.setProperty('--card-edge', edge + 'px'); el.style.setProperty('--card-radius', radius + 'px'); });
    };
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      panels.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var bg = el.firstElementChild;
        if (r.bottom < -50 || r.top > vh + 50) return; // off screen
        // Stays a card until its heading reaches the middle of the window, then grows,
        // reaching full width when the container's top reaches the top of the window.
        var h = el.querySelector('h2');
        var headOffset = h ? h.getBoundingClientRect().top - r.top : 0; // heading's distance below the container top
        var start = Math.max(vh * 0.5 - headOffset, 1);                 // container top position when the heading is halfway
        var grow = clamp01((start - r.top) / start);
        var shrink = clamp01((r.bottom - vh * 0.15) / (vh * 0.85)); // mirror image: starts shrinking as its end leaves the bottom of the window
        // a closed card stays a card; while a card opens or closes, the panel eases to its new size
        var target = el.classList.contains('is-closed') ? 0 : ease(Math.min(grow, shrink));
        var p = (el._p == null || performance.now() > blendUntil) ? target : el._p + (target - el._p) * 0.16;
        el._p = p;
        el.classList.toggle('is-full', p > 0.995); // fully grown: shows the COLLAPSE label
        var x = (edge * (1 - p)).toFixed(1);
        var rad = (radius * (1 - p)).toFixed(1);
        bg.style.clipPath = 'inset(0 ' + x + 'px 0 ' + x + 'px round ' + rad + 'px)';
      });
    };
    var request = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    var blendUntil = 0;
    kickPanels = function () { // keep re-drawing while a card opens or closes (its height changes without scrolling)
      blendUntil = performance.now() + 900;
      var loop = function () { update(); if (performance.now() < blendUntil + 50) requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    };
    measure(); update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', function () { measure(); request(); });
  }

  // Scroll reveal (.rv): each element fades and slides in once, when it scrolls into view
  var reveals = document.querySelectorAll('.rv');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); rio.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    // case studies can be taller than the window once open, so they reveal as soon as any part shows
    var rioTall = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); rioTall.unobserve(e.target); } });
    }, { threshold: 0 });
    reveals.forEach(function (el) { (el.classList.contains('case') ? rioTall : rio).observe(el); });
  }

  // Before/after website frames scroll together: scrolling either one moves the other to the same
  // point of its page (by proportion, as the two pages are not exactly the same height), so the same
  // part of the site is always shown side by side.
  document.querySelectorAll('.compare-pair').forEach(function (pair) {
    var frames = pair.querySelectorAll('.frame');
    if (frames.length !== 2) return;
    Array.prototype.forEach.call(frames, function (f, i) {
      var other = frames[1 - i];
      f.addEventListener('scroll', function () {
        if (f._synced) { f._synced = false; return; } // this scroll came from its partner
        var range = f.scrollHeight - f.clientHeight, otherRange = other.scrollHeight - other.clientHeight;
        if (range <= 0 || otherRange <= 0) return;
        var target = Math.round(f.scrollTop / range * otherRange);
        if (Math.abs(other.scrollTop - target) < 1) return;
        other._synced = true;
        other.scrollTop = target;
      }, { passive: true });
    });
  });

  // Image viewer
  var dlg = document.querySelector('.lightbox');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var img = dlg.querySelector('img');
  var cap = dlg.querySelector('.lb-caption');
  var count = dlg.querySelector('.lb-count');
  var prev = dlg.querySelector('.lb-prev');
  var next = dlg.querySelector('.lb-next');
  var close = dlg.querySelector('.lb-close');
  var list = [], index = 0, opener = null, altText = '', caps = [], caption = '';
  var frame = dlg.querySelector('.lb-frame'), scrollers = []; // tall screenshots shown in a scrolling frame

  // An item can have several pages (separated by ";" in data-src), e.g. the spreads of an eBook.
  // The side arrows turn the pages; Previous/Next at the bottom move between items.
  var pagePrev = dlg.querySelector('.lb-page-prev'), pageNext = dlg.querySelector('.lb-page-next');
  var pageNo = dlg.querySelector('.lb-pageno'), pages = [], page = 0;
  var vid = dlg.querySelector('.lb-video'), posters = []; // items ending in .mp4 play as video
  var squares = [];

  function show() {
    var tall = scrollers.indexOf(index + 1) !== -1;
    dlg.classList.toggle('is-scroll', tall);
    if (frame) { frame.scrollTop = 0; if (tall) frame.setAttribute('tabindex', '0'); else frame.removeAttribute('tabindex'); }
    pages = list[index].split(';');
    if (page > pages.length - 1) page = pages.length - 1;
    var multi = pages.length > 1;
    dlg.classList.toggle('is-square', squares.indexOf(index + 1) !== -1);
    var isVideo = /\.(mp4|webm)$/i.test(pages[page]);
    if (vid) {
      vid.pause();
      vid.hidden = !isVideo; img.hidden = isVideo;
      if (isVideo) { vid.src = pages[page]; if (posters[index]) vid.poster = posters[index]; else vid.removeAttribute('poster'); vid.setAttribute('aria-label', caps[index] || caption); }
      else { vid.removeAttribute('src'); vid.load(); }
    }
    if (!isVideo) { img.src = pages[page]; if (img.complete) requestAnimationFrame(placeArrows); }
    if (page + 1 < pages.length) { var pre = new Image(); pre.src = pages[page + 1]; } // load the next page in the background
    img.alt = (caps[index] || altText) + (multi ? ' Page view ' + (page + 1) + ' of ' + pages.length + '.' : '');
    cap.textContent = caps[index] || caption;
    if (pageNo) { pageNo.textContent = multi ? (page + 1) + ' / ' + pages.length : ''; pageNo.hidden = !multi; }
    // the side arrows stay active: at the first or last page they carry on into the previous or next item
    if (pagePrev) pagePrev.hidden = !multi;
    if (pageNext) pageNext.hidden = !multi;
    dlg.classList.toggle('has-pages', multi);
    dlg.classList.toggle('has-more', multi || list.length > 1);
    var many = list.length > 1;
    prev.hidden = next.hidden = !many;
    count.textContent = many ? (index + 1) + ' of ' + list.length : '';
  }
  // Page arrows sit right beside the image instead of at the screen edges. Within one item they only
  // ever move outwards (e.g. from a single cover page to the wider spreads), so they don't keep
  // jumping under the mouse while you turn pages.
  var span = null, spanKey = '';
  function placeArrows() {
    if (!pagePrev || !pageNext || !dlg.open || pages.length < 2 || img.hidden) return;
    var r = img.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var key = index + '|' + list[0];
    if (key !== spanKey) { span = null; spanKey = key; }
    var L = span ? Math.min(r.left, span[0]) : r.left, R = span ? Math.max(r.right, span[1]) : r.right;
    span = [L, R];
    var w = pagePrev.offsetWidth || 52, gap = 14, vw = document.documentElement.clientWidth;
    pagePrev.style.left = Math.max(8, L - gap - w) + 'px';
    pageNext.style.left = Math.min(vw - 8 - w, R + gap) + 'px';
    pageNext.style.right = 'auto';
    pagePrev.style.top = pageNext.style.top = (r.top + r.height / 2) + 'px';
  }
  img.addEventListener('load', placeArrows);
  // Clicking the image moves on: the next page, or after the last page the next item.
  // Not for tall screenshots in the scrolling frame, where a click is part of reading them.
  img.addEventListener('click', function () {
    if (dlg.classList.contains('is-scroll') || (pages.length < 2 && list.length < 2)) return;
    goPage(1);
  });
  window.addEventListener('resize', function () { span = null; placeArrows(); });

  function goItem(step) { index = (index + step + list.length) % list.length; page = 0; show(); }
  function goPage(step) {
    // turn a page; past the first or last page, move on to the previous or next item
    if (page + step >= 0 && page + step < pages.length) { page += step; show(); }
    else if (list.length > 1) { index = (index + step + list.length) % list.length; page = step < 0 ? list[index].split(';').length - 1 : 0; show(); }
  }

  document.querySelectorAll('.zoom').forEach(function (btn) {
    btn.addEventListener('click', function () {
      list = btn.getAttribute('data-src').split('|');
      index = 0; page = 0;
      opener = btn;
      var thumb = btn.querySelector('img');
      altText = thumb ? thumb.alt : '';
      caption = btn.getAttribute('data-caption') || '';
      caps = (btn.getAttribute('data-captions') || '').split('|').filter(Boolean); // one caption per image, when given
      scrollers = (btn.getAttribute('data-scroll') || '').split('|').map(Number).filter(Boolean); // e.g. data-scroll="2": image 2 scrolls
      posters = (btn.getAttribute('data-posters') || '').split('|'); // still frame shown before a video plays
      squares = (btn.getAttribute('data-square') || '').split('|').map(Number).filter(Boolean); // documents and flyers: square corners
      dlg.classList.toggle('is-gallery', btn.classList.contains('brand-card')); // Gallery items get the case-study border
      show();
      dlg.showModal();
      close.focus();
    });
  });

  prev.addEventListener('click', function () { goItem(-1); });
  next.addEventListener('click', function () { goItem(1); });
  if (pagePrev) pagePrev.addEventListener('click', function () { goPage(-1); });
  if (pageNext) pageNext.addEventListener('click', function () { goPage(1); });
  // swipe left or right on touch screens to turn pages
  var touchX = null;
  dlg.addEventListener('touchstart', function (e) { touchX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  dlg.addEventListener('touchend', function (e) {
    if (touchX === null || dlg.classList.contains('is-scroll')) return;
    var dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 50) goPage(dx < 0 ? 1 : -1);
  }, { passive: true });
  close.addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('lb-body')) dlg.close(); });
  document.addEventListener('keydown', function (e) { // works wherever focus is while the viewer is open
    if (!dlg.open) return;
    if (e.target && e.target.tagName === 'VIDEO') return; // let the arrow keys seek inside a playing video
    if (e.key === 'ArrowRight' && (pages.length > 1 || list.length > 1)) { e.preventDefault(); goPage(1); }
    if (e.key === 'ArrowLeft' && (pages.length > 1 || list.length > 1)) { e.preventDefault(); goPage(-1); }
  });
  dlg.addEventListener('close', function () { img.removeAttribute('src'); if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); vid.hidden = true; } img.hidden = false; if (opener) opener.focus(); });
})();

/* =========================================================================
   Mountain View Guesthouse & Lodge  |  assets/js/script.js
   WEDE5020 Part 3: JavaScript functionality

   One script is loaded by every page. Each feature below is an init function that
   first checks whether its page contains the elements it needs, then switches itself
   on, so nothing runs (or breaks) on pages where it does not apply.

   FEATURE                         PAGE(S)                  POE REQUIREMENT
   -------------------------------------------------------------------------------
   1.  initNav                     all                      mobile menu (Part 2 fix)
   2.  initTodayStrip              home                     DOM manipulation, date/time
   3.  initMonthPlanner            home                     dynamic content (AJAX/JSON)
   4.  initCountUp                 home                     animation
   5.  initAccordions              accommodation            interactive element
   6.  initLightbox                about, accommodation     gallery + lightbox
   7.  initActivityFilter          things-to-do             search, filter and sort
   8.  initEnquiryForm             enquiry                  validation, AJAX, response
   9.  initContactForm             contact                  validation, compiled email
   10. initMap                     contact                  interactive map (Leaflet)

   No framework is used; this is plain ("vanilla") JavaScript.
   ========================================================================= */

(function () {
  'use strict';

  /* -----------------------------------------------------------------------
     0. SHARED SETTINGS AND HELPERS
     ----------------------------------------------------------------------- */

  // Captured now, because document.currentScript is only set while the script first runs.
  // Every data/vendor path is worked out from this, so it works from any page depth.
  var SCRIPT_URL = document.currentScript ? document.currentScript.src : window.location.href;

  var RECIPIENT = 'stay@mountainviewsomerseteast.co.za';   // where compiled emails are addressed
  var PHONE_DISPLAY = '042 000 0000';
  var TIME_ZONE = 'Africa/Johannesburg';                   // the guesthouse's clock, whatever the visitor's
  var GUESTHOUSE = { lat: -32.7188, lng: 25.5848 };

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Fallback copy of assets/data/rooms.json. A browser will not let a page opened straight
     from disk (file://) fetch other files, so this keeps the enquiry form working when the
     site is opened by double-clicking index.html. Online, the JSON file is always used. */
  var FALLBACK_ROOMS = {
    rooms: [
      { id: 'standard',      name: 'Standard Double Room',        rate: 950,  maxGuests: 2, basis: 'B&B',
        blocked: [{ from: '2026-11-27', to: '2026-11-29' }] },
      { id: 'mountain-view', name: 'Superior Mountain-View Room', rate: 1250, maxGuests: 3, basis: 'B&B',
        blocked: [{ from: '2026-11-13', to: '2026-11-16' }, { from: '2026-12-18', to: '2027-01-04' }] },
      { id: 'family',        name: 'Family Suite',                rate: 1800, maxGuests: 4, basis: 'B&B',
        blocked: [{ from: '2026-12-26', to: '2027-01-02' }] },
      { id: 'cottage',       name: 'Garden Cottage',              rate: 1550, maxGuests: 2, basis: 'self-catering',
        blocked: [{ from: '2026-12-10', to: '2026-12-14' }] }
    ],
    extras: [
      { id: 'packed-lunch',   name: 'Packed trail lunch',             price: 85,  per: 'guest per day' },
      { id: 'trailhead-drop', name: 'Trailhead drop-off and pick-up', price: 180, per: 'stay' },
      { id: 'fishing-guide',  name: 'Fly-fishing guide introduction', price: 450, per: 'stay' },
      { id: 'braai-pack',     name: 'Braai pack for the stoep',       price: 220, per: 'stay' }
    ],
    seasons: [{ name: 'Festive season', from: '12-15', to: '01-06', uplift: 0.2 }]
  };

  function $(selector, context) { return (context || document).querySelector(selector); }
  function $$(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }

  /** Build an element with optional class and text. Text is always set with textContent,
      so anything a visitor types can never be interpreted as HTML (basic XSS protection). */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  /** Fetch a JSON file from assets/data (an asynchronous AJAX request).
      If the request fails for any reason, resolve with the fallback instead. */
  function loadJSON(file, fallback) {
    var url = new URL('../data/' + file, SCRIPT_URL).href;
    return fetch(url, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .catch(function () { return fallback; });
  }

  /** Format a number of rand, e.g. 1250 becomes "R1 250" (non-breaking space). */
  function rand(amount) {
    return 'R' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  }

  /* ---- Dates. Everything is calculated in UTC so daylight saving can never shift a night. ---- */
  var DAY = 86400000;
  function parseISO(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || '');
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(t);
    // reject impossible dates such as 2026-02-31
    return (d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]) ? t : null;
  }
  function toISO(t) { return new Date(t).toISOString().slice(0, 10); }
  function todayISO() {
    // en-CA formats dates as YYYY-MM-DD; use the guesthouse's time zone
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
  }
  function prettyDate(t) {
    return new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(t));
  }

  /* ---- Shared form helpers (used by the enquiry and contact forms) ---- */

  /** Show or clear the error message that sits directly under a field. */
  function setError(input, message) {
    var box = document.getElementById(input.id + '-error');
    if (message) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
      input.setAttribute('aria-invalid', 'true');
      if (box) { box.textContent = message; box.hidden = false; }
    } else {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      if (box) { box.textContent = ''; box.hidden = true; }
    }
    return message;
  }
  function markValid(input) { if (input.value.trim() !== '') input.classList.add('is-valid'); }

  var rules = {
    // letters (any language), spaces, apostrophes, hyphens and full stops
    name: function (v) {
      v = v.trim();
      if (!v) return 'Enter your full name.';
      if (v.length < 2) return 'Your name needs at least 2 characters.';
      if (v.length > 60) return 'Keep your name to 60 characters or fewer.';
      if (!/^[\p{L}][\p{L}\s'’.\-]*$/u.test(v)) return 'Use letters only in your name (spaces, hyphens and apostrophes are fine).';
      return '';
    },
    email: function (v) {
      v = v.trim();
      if (!v) return 'Enter your email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter an email address in the form name@example.com.';
      return '';
    },
    // South African numbers: 0XX XXX XXXX, +27 XX XXX XXXX or 0027 XX XXX XXXX
    phone: function (v, optional) {
      v = v.trim();
      if (!v) return optional ? '' : 'Enter a phone number we can reach you on.';
      var digits = v.replace(/[\s\-().]/g, '');
      if (!/^(?:\+27|0027|0)[1-9]\d{8}$/.test(digits)) return 'Enter a South African number such as 082 123 4567 or +27 82 123 4567.';
      return '';
    }
  };

  /** Wire up "validate on leaving the field, then fix live while typing" for a list of fields. */
  function liveValidate(pairs) {
    pairs.forEach(function (pair) {
      var input = pair[0], check = pair[1];
      input.addEventListener('blur', function () {
        if (!setError(input, check())) markValid(input);
      });
      var recheck = function () {
        if (input.classList.contains('is-invalid') && !setError(input, check())) markValid(input);
      };
      input.addEventListener('input', recheck);
      input.addEventListener('change', recheck);
    });
  }

  /** Run every check, show every message, and focus the first field that failed. */
  function validateAll(pairs) {
    var firstBad = null, bad = 0;
    pairs.forEach(function (pair) {
      var message = setError(pair[0], pair[1]());
      if (message) { bad++; if (!firstBad) firstBad = pair[0]; } else { markValid(pair[0]); }
    });
    if (firstBad) firstBad.focus();
    return bad;
  }

  /** Live "n of max characters" counter under a textarea. */
  function charCounter(textarea, counter, min) {
    var max = textarea.maxLength;
    function update() {
      var n = textarea.value.length;
      counter.textContent = n + ' of ' + max + ' characters' + (min ? ' (minimum ' + min + ')' : '');
      counter.classList.toggle('is-near-limit', n >= max * 0.9);
    }
    textarea.addEventListener('input', update);
    update();
  }

  /** Open a pre-written email in the visitor's email app. */
  function mailtoLink(subject, body) {
    return 'mailto:' + RECIPIENT +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body.replace(/\r?\n/g, '\r\n'));
  }

  /** A trimmed value with control characters removed (input hygiene before it is used). */
  function clean(value) { return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim(); }


  /* -----------------------------------------------------------------------
     1. MOBILE NAVIGATION  (Part 2 fix: the menu button had no script)
     ----------------------------------------------------------------------- */
  function initNav() {
    var toggle = $('.nav-toggle');
    var nav = $('#primary-navigation');
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '✕' : '☰';
    }

    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });

    // close with Escape (and return focus to the button), after choosing a link, or by tapping elsewhere
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    // never leave the menu "open" after rotating a tablet or widening the window
    window.matchMedia('(min-width: 769px)').addEventListener('change', function (e) { if (e.matches) setOpen(false); });
  }


  /* -----------------------------------------------------------------------
     2. "TODAY" STRIP  (home page): greeting + live breakfast / check-in status
     Uses the Date object and Intl to read the time at the guesthouse.
     ----------------------------------------------------------------------- */
  function initTodayStrip() {
    var greeting = $('#today-greeting');
    var status = $('#today-status');
    if (!greeting || !status) return;

    function update() {
      var parts = {};
      new Intl.DateTimeFormat('en-ZA', {
        timeZone: TIME_ZONE, hourCycle: 'h23', hour: 'numeric', minute: 'numeric',
        weekday: 'long', day: 'numeric', month: 'long'
      }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });

      var hour = parseInt(parts.hour, 10);
      var minutes = hour * 60 + parseInt(parts.minute, 10);
      var hello = hour < 12 ? 'Good morning' : (hour < 18 ? 'Good afternoon' : 'Good evening');
      greeting.textContent = hello + '. It\u2019s ' + parts.weekday + ' ' + parts.day + ' ' + parts.month + ' at Mountain View.';

      var text, live = false;
      if (minutes < 7 * 60)        { text = 'Breakfast opens at 07:00.'; }
      else if (minutes < 9 * 60)   { text = 'Breakfast is being served now, until 09:00.'; live = true; }
      else if (minutes < 14 * 60)  { text = 'Check-in opens at 14:00 today.'; }
      else if (minutes < 20 * 60)  { text = 'Check-in is open now, until 20:00.'; live = true; }
      else                         { text = 'Check-in has closed for tonight. Call ' + PHONE_DISPLAY + ' if you will arrive late.'; }
      status.textContent = text;
      status.classList.toggle('is-live', live);
    }

    update();
    window.setInterval(update, 60000);   // keep it current if the page stays open
  }


  /* -----------------------------------------------------------------------
     3. MONTH PLANNER  (home page): dynamic content loaded from seasons.json
     ----------------------------------------------------------------------- */
  function initMonthPlanner() {
    var picker = $('#month-picker');
    var card = $('#month-card');
    if (!picker || !card) return;

    var title = $('#month-title'), text = $('#month-text'), link = $('#month-link');
    // from the home page the data links need a "pages/" prefix
    var brand = $('.brand');
    var prefix = brand && brand.getAttribute('href') === 'index.html' ? 'pages/' : '';

    loadJSON('seasons.json', null).then(function (data) {
      if (!data || !data.months || !data.months.length) return;   // keep the static fallback text

      var thisMonth = parseInt(new Intl.DateTimeFormat('en-ZA', { timeZone: TIME_ZONE, month: 'numeric' }).format(new Date()), 10);
      var buttons = [];

      function show(entry, animate) {
        function paint() {
          title.textContent = entry.title;
          text.textContent = entry.text;
          // only allow links to our own pages (letters, hyphens, a query string), never arbitrary URLs
          if (/^[a-z-]+\.html(\?[\w=&.,-]*)?$/.test(entry.link)) {
            link.href = prefix + entry.link;
            link.textContent = entry.linkText + ' \u2192';
          }
          card.classList.remove('is-changing');
        }
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.month === entry.month)); });
        if (animate && !prefersReducedMotion) {
          card.classList.add('is-changing');
          window.setTimeout(paint, 200);
        } else { paint(); }
      }

      data.months.forEach(function (entry) {
        var b = el('button', 'month-btn', entry.short);
        b.type = 'button';
        b.dataset.month = entry.month;
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', entry.title + ' (month ' + entry.month + ')');
        b.addEventListener('click', function () { show(entry, true); });
        picker.appendChild(b);
        buttons.push(b);
      });

      show(data.months.filter(function (m) { return m.month === thisMonth; })[0] || data.months[0], false);
    });
  }


  /* -----------------------------------------------------------------------
     4. COUNT-UP ANIMATION  (home page "15+ years" badge)
     Runs once, when the badge scrolls into view.
     ----------------------------------------------------------------------- */
  function initCountUp() {
    var nodes = $$('[data-count-to]');
    if (!nodes.length || prefersReducedMotion || !('IntersectionObserver' in window)) return;

    function run(node) {
      var target = parseInt(node.dataset.countTo, 10);
      var suffix = node.dataset.countSuffix || '';
      var start = null, duration = 1200;
      function frame(now) {
        if (start === null) start = now;
        var progress = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);              // ease-out
        node.textContent = Math.round(target * eased) + suffix;
        if (progress < 1) window.requestAnimationFrame(frame);
      }
      window.requestAnimationFrame(frame);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { run(entry.target); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.3 });

    nodes.forEach(function (node) {
      node.textContent = '0' + (node.dataset.countSuffix || '');
      observer.observe(node);
    });
  }


  /* -----------------------------------------------------------------------
     5. ACCORDION  (accommodation FAQ)
     Each trigger is a <button>; aria-expanded tells screen readers its state and the
     "is-open" class on the panel starts the CSS height animation.
     ----------------------------------------------------------------------- */
  function initAccordions() {
    $$('[data-accordion]').forEach(function (accordion) {
      var triggers = $$('.accordion-trigger', accordion);

      function toggle(button) {
        var open = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!open));
        document.getElementById(button.getAttribute('aria-controls')).classList.toggle('is-open', !open);
      }

      triggers.forEach(function (button, i) {
        button.addEventListener('click', function () { toggle(button); });
        // keyboard: arrow keys, Home and End move between questions (WAI-ARIA accordion pattern)
        button.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowDown') next = triggers[(i + 1) % triggers.length];
          else if (e.key === 'ArrowUp') next = triggers[(i - 1 + triggers.length) % triggers.length];
          else if (e.key === 'Home') next = triggers[0];
          else if (e.key === 'End') next = triggers[triggers.length - 1];
          if (next) { e.preventDefault(); next.focus(); }
        });
      });
    });
  }


  /* -----------------------------------------------------------------------
     6. LIGHTBOX  (about gallery + accommodation room photos)
     Any element with data-lightbox="groupName", data-full="large image" and
     data-caption="text" opens the viewer. Photos in the same group can be paged through.
     ----------------------------------------------------------------------- */
  function initLightbox() {
    var triggers = $$('[data-lightbox]');
    if (!triggers.length) return;

    var groups = {};
    triggers.forEach(function (t) {
      (groups[t.dataset.lightbox] = groups[t.dataset.lightbox] || []).push(t);
    });

    // Build the viewer once. Everything here is static markup, no visitor input.
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML =
      '<button type="button" class="lightbox-btn lightbox-close" aria-label="Close photo viewer">\u00D7</button>' +
      '<button type="button" class="lightbox-btn lightbox-prev" aria-label="Previous photo">\u2039</button>' +
      '<figure class="lightbox-figure">' +
        '<img class="lightbox-img" alt="">' +
        '<figcaption class="lightbox-caption"><span class="lightbox-text"></span><span class="lightbox-count"></span></figcaption>' +
      '</figure>' +
      '<button type="button" class="lightbox-btn lightbox-next" aria-label="Next photo">\u203A</button>';
    document.body.appendChild(box);

    var img = $('.lightbox-img', box), text = $('.lightbox-text', box), count = $('.lightbox-count', box);
    var closeBtn = $('.lightbox-close', box), prevBtn = $('.lightbox-prev', box), nextBtn = $('.lightbox-next', box);
    var group = [], index = 0, opener = null;

    function preload(i) {
      var item = group[(i + group.length) % group.length];
      if (item) { var p = new Image(); p.src = item.dataset.full; }
    }

    function show(i) {
      index = (i + group.length) % group.length;
      var item = group[index];
      img.classList.remove('is-loaded');
      img.onload = function () { img.classList.add('is-loaded'); };
      img.onerror = function () { img.classList.add('is-loaded'); text.textContent = 'Sorry, this photo could not be loaded.'; };
      img.src = item.dataset.full;
      img.alt = item.dataset.caption || '';
      text.textContent = item.dataset.caption || '';
      count.textContent = group.length > 1 ? (index + 1) + ' of ' + group.length : '';
      preload(index + 1);
      preload(index - 1);
    }

    function open(trigger) {
      group = groups[trigger.dataset.lightbox];
      opener = trigger;
      box.classList.toggle('lightbox-single', group.length < 2);
      show(group.indexOf(trigger));
      box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
      box.classList.add('is-open');
      closeBtn.focus();
    }

    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
      if (opener) opener.focus();      // hand focus back to where the visitor was
    }

    triggers.forEach(function (t) { t.addEventListener('click', function () { open(t); }); });
    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { show(index - 1); });
    nextBtn.addEventListener('click', function () { show(index + 1); });

    // click on the dark backdrop (not the photo or a button) closes it
    box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lightbox-figure')) close(); });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowLeft' && group.length > 1) { show(index - 1); }
      else if (e.key === 'ArrowRight' && group.length > 1) { show(index + 1); }
      else if (e.key === 'Tab') {
        // keep keyboard focus inside the open dialog
        var focusable = [closeBtn].concat(group.length > 1 ? [prevBtn, nextBtn] : []);
        var pos = focusable.indexOf(document.activeElement);
        e.preventDefault();
        focusable[(pos + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
      }
    });

    // swipe left / right on touch screens
    var touchX = null;
    box.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (touchX === null || group.length < 2) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });
  }


  /* -----------------------------------------------------------------------
     7. SEARCH, FILTER AND SORT  (things-to-do)
     Three controls work together: the category buttons (filter), the search box
     (keyword search) and the sort menu (re-orders the cards in the DOM).
     ----------------------------------------------------------------------- */
  function initActivityFilter() {
    var grid = $('#activity-grid');
    if (!grid) return;

    var cards = $$('.activity-card', grid);
    var tabs = $$('.tab-btn');
    var search = $('#activity-search'), sortSelect = $('#activity-sort');
    var count = $('#result-count'), empty = $('#empty-state'), reset = $('#reset-filters');
    var state = { category: 'all', query: '', sort: 'featured' };

    // Read each card once: its words for searching, its title, and how long it takes.
    cards.forEach(function (card, i) {
      var heading = $('h3', card);
      card._order = i;
      card._text = card.textContent.toLowerCase().replace(/\s+/g, ' ');
      card._heading = heading;
      card._title = heading.textContent.trim();
      card._hours = parseFloat(card.dataset.hours) || 0;
    });

    var sorters = {
      featured: function (a, b) { return a._order - b._order; },
      az:       function (a, b) { return a._title.localeCompare(b._title, 'en'); },
      shortest: function (a, b) { return a._hours - b._hours || a._order - b._order; },
      longest:  function (a, b) { return b._hours - a._hours || a._order - b._order; }
    };

    /** Put the matching words of a title in <mark>, using DOM nodes (never innerHTML). */
    function highlight(card, query) {
      var h = card._heading, title = card._title;
      h.textContent = '';
      var at = query ? title.toLowerCase().indexOf(query) : -1;
      if (at < 0) { h.textContent = title; return; }
      h.appendChild(document.createTextNode(title.slice(0, at)));
      h.appendChild(el('mark', 'hit', title.slice(at, at + query.length)));
      h.appendChild(document.createTextNode(title.slice(at + query.length)));
    }

    function apply() {
      var q = state.query.trim().toLowerCase();
      var shown = 0;

      cards.forEach(function (card) {
        var inCategory = state.category === 'all' || card.dataset.category === state.category;
        var matches = !q || card._text.indexOf(q) !== -1;
        card.hidden = !(inCategory && matches);
        if (!card.hidden) shown++;
        highlight(card, q);
      });

      // re-order by moving the existing elements (no content is recreated)
      cards.slice().sort(sorters[state.sort]).forEach(function (card) { grid.appendChild(card); });

      var filtered = q || state.category !== 'all';
      count.textContent = !filtered
        ? 'Showing all ' + cards.length + ' activities'
        : 'Showing ' + shown + ' of ' + cards.length + ' activities' + (q ? ' matching \u201C' + state.query.trim() + '\u201D' : '');
      empty.hidden = shown !== 0;
      grid.hidden = shown === 0;
    }

    function setCategory(category) {
      state.category = category;
      tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.dataset.filter === category)); });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { setCategory(tab.dataset.filter); apply(); });
    });

    var timer;
    search.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { state.query = clean(search.value).slice(0, 40); apply(); }, 120);
    });
    sortSelect.addEventListener('change', function () { state.sort = sortSelect.value; apply(); });
    reset.addEventListener('click', function () {
      state = { category: 'all', query: '', sort: 'featured' };
      search.value = ''; sortSelect.value = 'featured'; setCategory('all'); apply(); search.focus();
    });

    // arriving from the home-page planner with ?q=hik pre-fills the search
    var preset = clean(new URLSearchParams(window.location.search).get('q')).slice(0, 40);
    if (preset) { search.value = preset; state.query = preset; }
    apply();
  }


  /* -----------------------------------------------------------------------
     8. ENQUIRY FORM  (enquiry.html)
     Purpose: a question about a SPECIFIC stay. After validation the page answers it:
     is the room free on those dates, and what will it cost?
       user fills form -> HTML5 + JS validation -> fetch rooms.json (AJAX)
       -> work out availability and price -> show the response, no page reload
     ----------------------------------------------------------------------- */
  function initEnquiryForm() {
    var form = $('#enquiry-form');
    if (!form) return;

    var panel = $('#quote-panel'), statusLine = $('#enquiry-status'), extrasBox = $('#extras-list');
    var f = {
      name: $('#e-name'), email: $('#e-email'), phone: $('#e-phone'), room: $('#e-room'),
      checkin: $('#e-checkin'), checkout: $('#e-checkout'), guests: $('#e-guests'),
      notes: $('#e-notes'), trap: $('#e-website')
    };
    var guestHint = $('#e-guests-hint');
    var roomData = FALLBACK_ROOMS;       // replaced as soon as rooms.json arrives
    var lastQuote = null;

    function roomById(id) { return roomData.rooms.filter(function (r) { return r.id === id; })[0]; }

    /* --- extras checkboxes are generated from the data file --- */
    function renderExtras(extras) {
      extrasBox.textContent = '';
      extras.forEach(function (x) {
        var label = el('label', 'choice');
        var box = document.createElement('input');
        box.type = 'checkbox'; box.name = 'extras'; box.value = x.id;
        label.appendChild(box);
        label.appendChild(el('span', '', x.name));
        label.appendChild(el('span', 'extra-price', rand(x.price) + ' per ' + x.per));
        extrasBox.appendChild(label);
      });
    }
    function selectedExtras() {
      return $$('input[name="extras"]:checked', form).map(function (box) {
        return roomData.extras.filter(function (x) { return x.id === box.value; })[0];
      }).filter(Boolean);
    }

    /* --- guest limit follows the chosen room --- */
    function updateGuestLimit() {
      var room = roomById(f.room.value);
      var max = room ? room.maxGuests : 4;
      f.guests.max = max;
      guestHint.textContent = room ? room.name + ' sleeps up to ' + max + ' guests.' : 'Choose a room to see how many guests it sleeps.';
    }

    /* --- date inputs: nothing in the past, check-out always after check-in --- */
    var today = todayISO();
    f.checkin.min = today;
    f.checkout.min = today;
    f.checkin.addEventListener('change', function () {
      var inT = parseISO(f.checkin.value);
      if (inT === null) return;
      f.checkout.min = toISO(inT + DAY);
      var outT = parseISO(f.checkout.value);
      if (outT === null || outT <= inT) f.checkout.value = toISO(inT + DAY);   // suggest one night
      if (f.checkout.classList.contains('is-invalid')) setError(f.checkout, checkOut());
    });

    /* --- field checks (each returns '' when fine, or the message to show) --- */
    function checkName()  { return rules.name(f.name.value); }
    function checkEmail() { return rules.email(f.email.value); }
    function checkPhone() { return rules.phone(f.phone.value, false); }
    function checkRoom()  { return f.room.value && roomById(f.room.value) ? '' : 'Choose the room you would like to enquire about.'; }
    function checkIn() {
      var t = parseISO(f.checkin.value);
      if (!f.checkin.value) return 'Choose your check-in date.';
      if (t === null) return 'Enter a valid date.';
      if (t < parseISO(today)) return 'Check-in cannot be in the past. Choose today or a later date.';
      if (t > parseISO(today) + 730 * DAY) return 'We take enquiries up to two years ahead. Choose an earlier date.';
      return '';
    }
    function checkOut() {
      var a = parseISO(f.checkin.value), b = parseISO(f.checkout.value);
      if (!f.checkout.value) return 'Choose your check-out date.';
      if (b === null) return 'Enter a valid date.';
      if (a !== null && b <= a) return 'Check-out must be after check-in. Choose a later date.';
      if (a !== null && (b - a) / DAY > 30) return 'Online quotes cover stays of up to 30 nights. Call ' + PHONE_DISPLAY + ' for longer stays.';
      return '';
    }
    function checkGuests() {
      var n = Number(f.guests.value);
      var room = roomById(f.room.value);
      var max = room ? room.maxGuests : 4;
      if (f.guests.value.trim() === '') return 'Enter how many guests are staying.';
      if (!Number.isInteger(n) || n < 1) return 'Enter a whole number of guests, 1 or more.';
      if (n > max) return room ? room.name + ' sleeps up to ' + max + ' guests. Reduce the guests or choose a larger room.' : 'We can quote for up to 4 guests online.';
      return '';
    }

    var checks = [
      [f.name, checkName], [f.email, checkEmail], [f.phone, checkPhone], [f.room, checkRoom],
      [f.checkin, checkIn], [f.checkout, checkOut], [f.guests, checkGuests]
    ];
    liveValidate(checks);
    f.room.addEventListener('change', function () {
      updateGuestLimit();
      if (f.guests.classList.contains('is-invalid') || f.guests.value) setError(f.guests, checkGuests());
    });
    charCounter(f.notes, $('#e-notes-count'));

    /* --- availability and price --- */
    function inSeason(t, season) {
      var md = toISO(t).slice(5);
      return season.from <= season.to ? (md >= season.from && md <= season.to) : (md >= season.from || md <= season.to);
    }
    function conflicts(room, startT, nights) {
      var hits = [];
      room.blocked.forEach(function (b) {
        var from = parseISO(b.from), to = parseISO(b.to);
        // a stay occupies the nights from check-in up to (not including) check-out
        if (startT <= to && startT + (nights - 1) * DAY >= from) hits.push(b);
      });
      return hits;
    }
    function priceRoom(room, startT, nights) {
      var normal = 0, festive = 0, season = null;
      for (var i = 0; i < nights; i++) {
        var hit = roomData.seasons.filter(function (s) { return inSeason(startT + i * DAY, s); })[0];
        if (hit) { festive++; season = hit; } else { normal++; }
      }
      var festiveRate = season ? Math.round(room.rate * (1 + season.uplift)) : room.rate;
      return { normal: normal, festive: festive, season: season, festiveRate: festiveRate, total: normal * room.rate + festive * festiveRate };
    }

    function buildQuote(v) {
      var room = roomById(v.room);
      var startT = parseISO(v.checkin), nights = (parseISO(v.checkout) - startT) / DAY;
      var q = { v: v, room: room, startT: startT, nights: nights, blocked: conflicts(room, startT, nights) };
      q.available = q.blocked.length === 0;
      q.price = priceRoom(room, startT, nights);
      q.extras = v.extras.map(function (x) {
        var qty = x.per === 'guest per day' ? v.guests * nights : 1;
        return { name: x.name, detail: x.per === 'guest per day' ? v.guests + ' guests \u00D7 ' + nights + ' days \u00D7 ' + rand(x.price) : rand(x.price), amount: x.price * qty };
      });
      q.total = q.price.total + q.extras.reduce(function (sum, x) { return sum + x.amount; }, 0);
      if (!q.available) {
        q.alternatives = roomData.rooms.filter(function (r) {
          return r.id !== room.id && r.maxGuests >= v.guests && conflicts(r, startT, nights).length === 0;
        }).map(function (r) { return { room: r, cost: priceRoom(r, startT, nights).total }; });
      }
      return q;
    }

    /* --- show the response (all DOM building, using textContent) --- */
    function emailText(q) {
      var v = q.v;
      var lines = [
        'Hello Mountain View Guesthouse,', '',
        'I would like to confirm this stay:', '',
        'Room: ' + q.room.name,
        'Check-in: ' + prettyDate(q.startT),
        'Check-out: ' + prettyDate(q.startT + q.nights * DAY) + ' (' + q.nights + ' night' + (q.nights > 1 ? 's' : '') + ')',
        'Guests: ' + v.guests,
        'Extras: ' + (q.extras.length ? q.extras.map(function (x) { return x.name; }).join(', ') : 'None'),
        'Estimated total: ' + rand(q.total), ''
      ];
      if (v.notes) lines.push('Notes: ' + v.notes, '');
      lines.push('Name: ' + v.name, 'Email: ' + v.email, 'Phone: ' + v.phone);
      return lines.join('\n');
    }

    function row(label, amount, className) {
      var tr = el('tr', className);
      tr.appendChild(el('th', '', label)).setAttribute('scope', 'row');
      tr.appendChild(el('td', '', amount));
      return tr;
    }

    function renderQuote(q) {
      panel.textContent = '';
      panel.classList.remove('is-loading', 'is-available', 'is-unavailable');
      var stay = prettyDate(q.startT) + ' to ' + prettyDate(q.startT + q.nights * DAY);
      var facts = q.nights + ' night' + (q.nights > 1 ? 's' : '') + ', ' + q.v.guests + ' guest' + (q.v.guests > 1 ? 's' : '');

      if (q.available) {
        panel.classList.add('is-available');
        panel.appendChild(el('h3', '', q.room.name + ' is available'));
        panel.appendChild(el('p', 'quote-summary', stay + ' (' + facts + ')'));

        var table = el('table', 'quote-table');
        table.appendChild(el('caption', 'sr-only', 'Itemised estimate'));
        var body = el('tbody');
        if (q.price.normal) body.appendChild(row(q.price.normal + ' night' + (q.price.normal > 1 ? 's' : '') + ' \u00D7 ' + rand(q.room.rate) + ' (' + q.room.basis + ')', rand(q.price.normal * q.room.rate)));
        if (q.price.festive) body.appendChild(row(q.price.festive + ' festive night' + (q.price.festive > 1 ? 's' : '') + ' \u00D7 ' + rand(q.price.festiveRate) + ' (+' + Math.round(q.price.season.uplift * 100) + '%)', rand(q.price.festive * q.price.festiveRate)));
        q.extras.forEach(function (x) { body.appendChild(row(x.name + ' (' + x.detail + ')', rand(x.amount))); });
        body.appendChild(row('Estimated total', rand(q.total), 'quote-total'));
        table.appendChild(body);
        panel.appendChild(table);

        panel.appendChild(el('p', 'quote-note', 'This is an estimate. Our team confirms availability and the final price within 24 hours.'));

        var actions = el('div', 'quote-actions');
        var mail = el('a', 'btn btn-green', 'Email this request to us');
        mail.href = mailtoLink('Room enquiry: ' + q.room.name + ', ' + toISO(q.startT), emailText(q));
        var change = el('button', 'btn btn-outline-green', 'Change my dates');
        change.type = 'button';
        change.addEventListener('click', function () { f.checkin.focus(); });
        actions.appendChild(mail); actions.appendChild(change);
        panel.appendChild(actions);
      } else {
        panel.classList.add('is-unavailable');
        panel.appendChild(el('h3', '', q.room.name + ' is booked for some of those nights'));
        panel.appendChild(el('p', 'quote-summary', stay + ' (' + facts + ')'));
        panel.appendChild(el('p', '', 'Already booked: ' + q.blocked.map(function (b) { return prettyDate(parseISO(b.from)) + ' to ' + prettyDate(parseISO(b.to)); }).join('; ') + '.'));

        if (q.alternatives.length) {
          panel.appendChild(el('p', '', 'These rooms are free for your dates and sleep ' + q.v.guests + ' guest' + (q.v.guests > 1 ? 's' : '') + ':'));
          var list = el('ul', 'alt-rooms');
          q.alternatives.forEach(function (alt) {
            var li = el('li');
            var info = el('span');
            info.appendChild(el('span', 'alt-name', alt.room.name));
            info.appendChild(document.createTextNode(' from ' + rand(alt.cost) + ' for ' + q.nights + ' night' + (q.nights > 1 ? 's' : '')));
            var pick = el('button', 'btn btn-outline-green', 'Quote this room');
            pick.type = 'button';
            pick.addEventListener('click', function () {
              f.room.value = alt.room.id; updateGuestLimit();
              if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true }));
            });
            li.appendChild(info); li.appendChild(pick); list.appendChild(li);
          });
          panel.appendChild(list);
        } else {
          panel.appendChild(el('p', '', 'No other room is free for those dates. Try nearby dates, or call us on ' + PHONE_DISPLAY + '.'));
        }
        var tryAgain = el('button', 'btn btn-outline-green', 'Try different dates');
        tryAgain.type = 'button';
        tryAgain.style.marginTop = '1.25rem';
        tryAgain.addEventListener('click', function () { f.checkin.focus(); });
        panel.appendChild(tryAgain);
      }

      panel.focus();
      panel.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: window.innerWidth <= 768 ? 'start' : 'nearest' });
    }

    /* --- submit: validate, then ask for fresh data (AJAX) and answer on the same page --- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusLine.className = 'form-status text-center';

      // the honeypot is invisible to people; if it has a value a bot filled it in
      if (f.trap.value) { statusLine.textContent = ''; return; }

      var bad = validateAll(checks);
      if (bad) {
        statusLine.textContent = 'Please fix ' + bad + ' field' + (bad > 1 ? 's' : '') + ' marked above, then try again.';
        statusLine.classList.add('is-error');
        return;
      }

      var values = {
        name: clean(f.name.value), email: clean(f.email.value), phone: clean(f.phone.value),
        room: f.room.value, checkin: f.checkin.value, checkout: f.checkout.value,
        guests: Number(f.guests.value), notes: clean(f.notes.value), extras: selectedExtras()
      };

      statusLine.textContent = 'Checking availability\u2026';
      statusLine.classList.add('is-working');
      panel.classList.add('is-loading');

      loadJSON('rooms.json', FALLBACK_ROOMS).then(function (fresh) {
        roomData = fresh;
        lastQuote = buildQuote(values);
        renderQuote(lastQuote);
        statusLine.textContent = lastQuote.available ? 'Done. Your estimate is shown.' : 'That room is booked for those dates. See the options shown.';
        statusLine.className = 'form-status text-center ' + (lastQuote.available ? 'is-success' : 'is-error');
      });
    });

    /* --- start-up: load the data, build the extras, then apply any ?room=&extras= link --- */
    function applyQueryString() {
      var p = new URLSearchParams(window.location.search);
      var room = p.get('room');
      if (room && roomById(room)) { f.room.value = room; }
      var wanted = (p.get('extras') || '').split(',');
      $$('input[name="extras"]', form).forEach(function (box) { box.checked = wanted.indexOf(box.value) !== -1; });
      var guests = parseInt(p.get('guests'), 10);
      if (guests >= 1 && guests <= 4) f.guests.value = guests;
      var ci = p.get('checkin'), co = p.get('checkout');
      if (ci && parseISO(ci) !== null) f.checkin.value = ci;
      if (co && parseISO(co) !== null) f.checkout.value = co;
      updateGuestLimit();
    }

    renderExtras(roomData.extras);
    updateGuestLimit();
    loadJSON('rooms.json', FALLBACK_ROOMS).then(function (data) {
      roomData = data;
      renderExtras(roomData.extras);
      applyQueryString();
    });
  }


  /* -----------------------------------------------------------------------
     9. CONTACT FORM  (contact.html)
     Purpose: a GENERAL message to the organisation. After validation the details are
     compiled into an email addressed to RECIPIENT, which the visitor sends from their own
     email app. If the form has a data-endpoint (for example a Formspree URL) the message is
     instead posted there asynchronously (AJAX), so the page never reloads.
     ----------------------------------------------------------------------- */
  function initContactForm() {
    var form = $('#contact-form');
    if (!form) return;

    var f = {
      name: $('#c-name'), email: $('#c-email'), phone: $('#c-phone'), type: $('#c-type'),
      subject: $('#c-subject'), message: $('#c-message'), trap: $('#c-website')
    };
    var statusLine = $('#contact-status');
    var preview = $('#email-preview');
    var recipient = form.dataset.recipient || RECIPIENT;

    var checks = [
      [f.name,    function () { return rules.name(f.name.value); }],
      [f.email,   function () { return rules.email(f.email.value); }],
      [f.phone,   function () { return rules.phone(f.phone.value, true); }],
      [f.type,    function () { return f.type.value ? '' : 'Choose the type of message you are sending.'; }],
      [f.subject, function () {
        var v = f.subject.value.trim();
        if (!v) return 'Enter a subject for your message.';
        if (v.length < 5) return 'Make the subject at least 5 characters long.';
        return '';
      }],
      [f.message, function () {
        var n = f.message.value.trim().length;
        if (!n) return 'Write your message.';
        if (n < 20) return 'Your message is a little short. Please write at least 20 characters (' + (20 - n) + ' more).';
        return '';
      }]
    ];
    liveValidate(checks);
    charCounter(f.message, $('#c-message-count'), 20);

    function compose() {
      var reply = $('input[name="reply"]:checked', form).value;
      var phone = clean(f.phone.value);
      var subject = '[Website] ' + f.type.value + ': ' + clean(f.subject.value);
      var body = [
        'Hello Mountain View Guesthouse,', '',
        clean(f.message.value), '',
        '--------------------',
        'Message type: ' + f.type.value,
        'Name: ' + clean(f.name.value),
        'Email: ' + clean(f.email.value),
        'Phone: ' + (phone || 'Not provided'),
        'Please reply by: ' + reply,
        'Sent from the website contact form'
      ].join('\n');
      return { subject: subject, body: body };
    }

    function showPreview(mail) {
      $('#preview-to').textContent = recipient;
      $('#preview-subject').textContent = mail.subject;
      $('#preview-body').textContent = mail.body;
      var link = $('#mailto-link');
      link.href = 'mailto:' + recipient + '?subject=' + encodeURIComponent(mail.subject) +
        '&body=' + encodeURIComponent(mail.body.replace(/\n/g, '\r\n'));
      $('#copy-status').textContent = '';
      form.hidden = true;
      preview.hidden = false;
      preview.focus();
      preview.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusLine.className = 'form-status text-center';
      if (f.trap.value) { statusLine.textContent = ''; return; }          // honeypot

      var bad = validateAll(checks);
      if (bad) {
        statusLine.textContent = 'Please fix ' + bad + ' field' + (bad > 1 ? 's' : '') + ' marked above, then try again.';
        statusLine.classList.add('is-error');
        return;
      }

      var mail = compose();
      var endpoint = (form.dataset.endpoint || '').trim();

      if (/^https:\/\//.test(endpoint)) {
        // AJAX submission to a form service. Falls back to the email preview if it fails.
        statusLine.textContent = 'Sending your message\u2026';
        statusLine.classList.add('is-working');
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ name: clean(f.name.value), email: clean(f.email.value), phone: clean(f.phone.value), type: f.type.value, subject: clean(f.subject.value), message: clean(f.message.value) })
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          form.reset(); statusLine.textContent = 'Thank you. Your message has been sent and we will reply within 24 hours.';
          statusLine.className = 'form-status text-center is-success';
        }).catch(function () { showPreview(mail); });
        return;
      }

      showPreview(mail);
    });

    $('#edit-message').addEventListener('click', function () {
      preview.hidden = true; form.hidden = false; f.message.focus();
    });

    $('#copy-email').addEventListener('click', function () {
      var text = 'To: ' + recipient + '\nSubject: ' + $('#preview-subject').textContent + '\n\n' + $('#preview-body').textContent;
      var note = $('#copy-status');
      function done(ok) { note.textContent = ok ? 'Copied. You can paste it into any email app.' : 'Copy did not work. Select the text above and copy it by hand.'; note.className = 'form-status ' + (ok ? 'is-success' : 'is-error'); }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        document.body.removeChild(ta); done(ok);
      }
    });
  }


  /* -----------------------------------------------------------------------
     10. INTERACTIVE MAP  (contact.html) using Leaflet with OpenStreetMap tiles
     Leaflet is bundled in assets/vendor/leaflet, so it needs no API key or CDN.
     ----------------------------------------------------------------------- */
  function initMap() {
    var mapEl = $('#map');
    if (!mapEl) return;
    if (typeof L === 'undefined') {
      mapEl.appendChild(el('p', 'map-fallback', 'The map could not load. Use the Google Maps link below instead.'));
      return;
    }

    // tell Leaflet where its marker pictures live (relative to this script, so it works on any host)
    L.Icon.Default.mergeOptions({ imagePath: new URL('../vendor/leaflet/images/', SCRIPT_URL).href });

    var map = L.map(mapEl, { scrollWheelZoom: false }).setView([GUESTHOUSE.lat, GUESTHOUSE.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    }).addTo(map);

    // mouse-wheel zoom only once the map has focus, so scrolling the page never gets "stuck" on the map
    map.on('focus', function () { map.scrollWheelZoom.enable(); });
    map.on('blur',  function () { map.scrollWheelZoom.disable(); });

    var places = [
      { name: 'Mountain View Guesthouse and Lodge', note: '28 Nojoli Street, Somerset East', lat: GUESTHOUSE.lat, lng: GUESTHOUSE.lng, main: true },
      { name: 'Somerset East town centre', note: 'Shops, restaurants and the heritage tour (approximate location)', lat: -32.7236, lng: 25.5864 },
      { name: 'Boschberg foothills', note: 'Where the hiking and biking trails begin (approximate location)', lat: -32.7000, lng: 25.5700 }
    ];

    var list = $('#map-places');
    var bounds = [];

    places.forEach(function (place) {
      var latlng = [place.lat, place.lng];
      bounds.push(latlng);

      var popup = el('div');
      popup.appendChild(el('strong', '', place.name));
      popup.appendChild(el('br'));
      popup.appendChild(document.createTextNode(place.note));

      var marker = place.main
        ? L.marker(latlng, { title: place.name, alt: place.name })
        : L.circleMarker(latlng, { radius: 9, color: '#af7d34', weight: 3, fillColor: '#c8933f', fillOpacity: 0.9 });
      marker.bindPopup(popup).addTo(map);
      if (place.main) marker.openPopup();

      if (list) {
        var li = el('li');
        var btn = el('button', '', place.name);
        btn.type = 'button';
        btn.addEventListener('click', function () {
          map.flyTo(latlng, 15, { duration: prefersReducedMotion ? 0 : 1 });
          marker.openPopup();
          mapEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
        });
        li.appendChild(btn);
        list.appendChild(li);
      }
    });

    if (list) {
      var li = el('li'), all = el('button', '', 'Show all places');
      all.type = 'button';
      all.addEventListener('click', function () { map.fitBounds(bounds, { padding: [30, 30] }); });
      li.appendChild(all); list.appendChild(li);
    }

    // the map sits in a flexible layout, so tell Leaflet to re-measure once the page has settled
    window.addEventListener('load', function () { map.invalidateSize(); });
    window.addEventListener('resize', function () { map.invalidateSize(); });
  }


  /* -----------------------------------------------------------------------
     START: switch on every feature. Each one ignores pages it does not belong to.
     ----------------------------------------------------------------------- */
  initNav();
  initTodayStrip();
  initMonthPlanner();
  initCountUp();
  initAccordions();
  initLightbox();
  initActivityFilter();
  initEnquiryForm();
  initContactForm();
  initMap();

}());

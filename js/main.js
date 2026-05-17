/**
 * gorfed.net — front-end behaviour
 * ---------------------------------
 * This file wires up navigation, accessible tables, the music-page filter, and optional
 * Pretext-based card height balancing. Everything is plain DOM APIs (no framework) so
 * it stays easy to audit for security and performance.
 *
 * Security posture (defence in depth; site content is static HTML):
 * - No eval(), innerHTML assignment, or string-to-code paths.
 * - Mailto links are built only from allow-listed attribute patterns so a compromised
 *   editor session cannot inject javascript: or header-smuggling characters.
 * - “Whole row is clickable” only fires navigation when the row’s link passes URL scheme
 *   checks, so odd href values never reach link.click() / window.open.
 */

/** Called by Pretext card layout when fonts or viewport change; the boot IIFE assigns this. */
var pretextResizeSchedule = null;

/**
 * Local part of an email (before @). Restricted to common RFC 5322 atoms so control
 * characters and scheme-smuggling payloads never reach mailto: URIs.
 */
function isSafeMailtoLocalPart(s) {
  if (typeof s !== 'string' || s.length < 1 || s.length > 64) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(s);
}

/**
 * Domain label set for mailto (e.g. gorfed.net). No slashes, spaces, or @ — avoids
 * open redirects disguised as mail and header injection via newlines.
 */
function isSafeMailtoDomain(s) {
  if (typeof s !== 'string' || s.length < 1 || s.length > 253) return false;
  if (s.indexOf('..') !== -1 || s[0] === '.' || s[s.length - 1] === '.') return false;
  return /^[a-zA-Z0-9.-]+$/.test(s);
}

/**
 * True when a link is safe to follow from row-click / synthetic navigation.
 * Allows http(s), mailto, relative paths, and hash-only; blocks javascript:, data:,
 * vbscript:, and unknown schemes (e.g. file: is blocked on purpose for portability).
 */
function isSafeNavigationHref(href) {
  if (typeof href !== 'string') return false;
  var t = href.trim();
  if (!t) return false;
  var lower = t.toLowerCase();
  if (
    lower.indexOf('javascript:') === 0 ||
    lower.indexOf('data:') === 0 ||
    lower.indexOf('vbscript:') === 0
  ) {
    return false;
  }
  /* Protocol-relative URLs inherit the page origin’s scheme; block so we only allow explicit http(s) or path-like links. */
  if (t.slice(0, 2) === '//') return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^mailto:/i.test(t)) return true;
  if (t[0] === '/' || t[0] === '.' || t[0] === '#') return true;
  if (t.indexOf(':') === -1) return true;
  return false;
}

(function () {
  'use strict';

  var minViewportWidthPx = 768;
  var mainNav = document.getElementById('nav');
  var navToggleButton = document.getElementById('nav-toggle');
  var pageWrap = document.getElementById('page-wrap');
  var lockedScrollY = 0;
  var isScrollLocked = false;

  /**
   * Freeze background scroll while the mobile nav drawer is open.
   * Lock #page-wrap (not body) so iOS Safari keeps sticky header + tap targets stable;
   * body { position: fixed } commonly causes scroll jank and wrong scroll restoration.
   */
  function lockPageScroll() {
    if (isScrollLocked) return;
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('nav-scroll-locked');
    document.body.style.overflow = 'hidden';
    if (pageWrap) {
      pageWrap.style.position = 'fixed';
      pageWrap.style.top = '-' + lockedScrollY + 'px';
      pageWrap.style.left = '0';
      pageWrap.style.right = '0';
      pageWrap.style.width = '100%';
    } else {
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + lockedScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }
    isScrollLocked = true;
  }

  function unlockPageScroll() {
    if (!isScrollLocked) return;
    document.documentElement.classList.remove('nav-scroll-locked');
    document.body.style.overflow = '';
    if (pageWrap) {
      pageWrap.style.position = '';
      pageWrap.style.top = '';
      pageWrap.style.left = '';
      pageWrap.style.right = '';
      pageWrap.style.width = '';
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
    }
    var y = lockedScrollY;
    window.scrollTo(0, y);
    requestAnimationFrame(function () {
      window.scrollTo(0, y);
    });
    isScrollLocked = false;
  }

  /**
   * Obfuscates the address from scrapers while keeping a real mailto for humans.
   * data-user / data-domain are validated; subject is passed through encodeURIComponent only.
   */
  document.querySelectorAll('.js-email-link').forEach(function (el) {
    var user = el.getAttribute('data-user');
    var domain = el.getAttribute('data-domain');
    var subject = el.getAttribute('data-subject') || '';
    if (isSafeMailtoLocalPart(user) && isSafeMailtoDomain(domain)) {
      var href =
        'mailto:' + user + '@' + domain + (subject ? '?subject=' + encodeURIComponent(subject) : '');
      el.setAttribute('href', href);
      el.textContent = user + '@' + domain;
    }
  });

  initPretextCardLinks();
  initContactForm();
  initPastShowsFilter();

  var dataTableWraps = [
    { wrapId: 'upcoming-gigs-grid', rowSelector: 'tr.upcoming-gig-row', defaultKey: 'date', defaultDir: 'asc' },
    { wrapId: 'past-shows-grid', rowSelector: 'tr.past-show-row', defaultKey: 'date', defaultDir: 'desc' },
    { wrapId: 'project-press-grid', rowSelector: 'tr.press-project-row' },
  ];
  dataTableWraps.forEach(function (cfg) {
    initSortableDataTable(cfg.wrapId, cfg.rowSelector, cfg.defaultKey, cfg.defaultDir);
    initClickableTableRows(cfg.wrapId, cfg.rowSelector);
  });

  window.addEventListener(
    'resize',
    function () {
      if (typeof pretextResizeSchedule === 'function') pretextResizeSchedule();
    },
    { passive: true }
  );

  if (!mainNav || !navToggleButton) return;

  function isDesktopNav() {
    return window.innerWidth >= minViewportWidthPx;
  }

  /** On small viewports the drawer is hidden until opened; keep aria-hidden in sync for SR + a11y tree. */
  function syncNavAccessibility() {
    if (isDesktopNav()) {
      mainNav.removeAttribute('aria-hidden');
      return;
    }
    mainNav.setAttribute('aria-hidden', menuIsOpen() ? 'false' : 'true');
  }

  function openMenu() {
    mainNav.setAttribute('data-open', 'true');
    navToggleButton.setAttribute('aria-expanded', 'true');
    navToggleButton.setAttribute('aria-label', 'Close menu');
    syncNavAccessibility();
    lockPageScroll();
  }

  function closeMenu(shouldFocusToggle) {
    mainNav.setAttribute('data-open', 'false');
    navToggleButton.setAttribute('aria-expanded', 'false');
    navToggleButton.setAttribute('aria-label', 'Open menu');
    syncNavAccessibility();
    unlockPageScroll();
    if (shouldFocusToggle !== false) navToggleButton.focus();
  }

  function menuIsOpen() {
    return mainNav.getAttribute('data-open') === 'true';
  }

  syncNavAccessibility();

  navToggleButton.addEventListener('click', function () {
    if (menuIsOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  /** Choosing a link on small screens should dismiss the overlay menu. */
  mainNav.querySelectorAll('a').forEach(function (navLink) {
    navLink.addEventListener('click', function () {
      if (window.innerWidth < minViewportWidthPx) {
        closeMenu();
      }
    });
  });

  /** Escape closes the drawer without trapping focus (simple, predictable pattern). */
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && menuIsOpen()) {
      closeMenu();
    }
  });

  /** Collapse mobile nav when resizing to desktop (pretext resize is handled separately above). */
  window.addEventListener(
    'resize',
    function () {
      if (window.innerWidth >= minViewportWidthPx) {
        mainNav.setAttribute('data-open', 'false');
        navToggleButton.setAttribute('aria-expanded', 'false');
        navToggleButton.setAttribute('aria-label', 'Open menu');
        unlockPageScroll();
      }
      syncNavAccessibility();
    },
    { passive: true }
  );
})();

/**
 * Equalises min-heights of linked card grids using Pretext (typographic measurement).
 * Caches per-card prep work in a WeakMap so typing or DOM thrash doesn’t re-layout blindly.
 */
function initPretextCardLinks() {
  var P = window.Pretext;
  if (!P || !document.fonts) return;

  var cardPrepCache = new WeakMap();
  var debounceTimer = null;
  var CSS_MIN_CARD_PX = 96;

  function parsePx(value) {
    if (!value || value === 'auto') return 0;
    var n = parseFloat(value);
    return String(value).indexOf('px') !== -1 ? n : 0;
  }

  function lineHeightPx(el) {
    var s = window.getComputedStyle(el);
    var lh = s.lineHeight;
    var fs = parseFloat(s.fontSize) || 16;
    if (lh === 'normal') return Math.round(fs * 1.2);
    if (String(lh).indexOf('px') !== -1) return parseFloat(lh);
    var num = parseFloat(lh);
    if (!isNaN(num) && num > 0 && num < 6) return fs * num;
    return fs * 1.5;
  }

  function canvasFont(el) {
    var s = window.getComputedStyle(el);
    var raw = s.fontFamily.split(',')[0].trim();
    var fam = raw.replace(/^["']|["']$/g, '');
    var out = '';
    if (s.fontStyle === 'italic') out += 'italic ';
    out += s.fontWeight + ' ' + s.fontSize + ' "' + fam + '"';
    return out;
  }

  function ensurePrepared(card) {
    var h3 = card.querySelector('h3');
    if (!h3) return null;
    var p = card.querySelector('p');
    var label = card.querySelector('.card-link-label');
    var sig =
      (h3.textContent || '').trim() +
      '\0' +
      (p ? (p.textContent || '').trim() : '') +
      '\0' +
      (label ? (label.textContent || '').trim() : '');
    var prev = cardPrepCache.get(card);
    if (prev && prev.sig === sig) return prev;
    var prepH3 = P.prepare((h3.textContent || '').trim(), canvasFont(h3));
    var prepP = p && (p.textContent || '').trim() ? P.prepare((p.textContent || '').trim(), canvasFont(p)) : null;
    var prepL =
      label && (label.textContent || '').trim()
        ? P.prepare((label.textContent || '').trim(), canvasFont(label))
        : null;
    var st = { sig: sig, prepH3: prepH3, prepP: prepP, prepL: prepL, h3: h3, p: p, label: label };
    cardPrepCache.set(card, st);
    return st;
  }

  function applyCardMinHeights() {
    var main = document.querySelector('main');
    if (!main) return;
    var cards = main.querySelectorAll('a.card-list-item');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var st = ensurePrepared(card);
      if (!st) continue;
      var cs = window.getComputedStyle(card);
      var pl = parsePx(cs.paddingLeft);
      var pr = parsePx(cs.paddingRight);
      var pt = parsePx(cs.paddingTop);
      var pb = parsePx(cs.paddingBottom);
      var w = Math.max(32, card.clientWidth - pl - pr);
      var lhH = lineHeightPx(st.h3);
      var hH = P.layout(st.prepH3, w, lhH).height;
      var mbH = parsePx(window.getComputedStyle(st.h3).marginBottom);
      var hP = 0;
      var mbP = 0;
      if (st.prepP && st.p) {
        var lhP = lineHeightPx(st.p);
        hP = P.layout(st.prepP, w, lhP).height;
        mbP = parsePx(window.getComputedStyle(st.p).marginBottom);
      }
      var hL = 0;
      if (st.prepL && st.label) {
        var lhL = lineHeightPx(st.label);
        hL = P.layout(st.prepL, w, lhL).height;
      }
      var total = pt + hH + mbH + hP + mbP + hL + pb;
      var px = Math.max(CSS_MIN_CARD_PX, Math.ceil(total));
      card.style.minHeight = px + 'px';
    }
  }

  function schedule() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      applyCardMinHeights();
    }, 100);
  }

  pretextResizeSchedule = schedule;

  document.fonts.ready.then(applyCardMinHeights).catch(function () {
    applyCardMinHeights();
  });
}

/**
 * Contact page form (Web3Forms).
 * Keeps the local topic taxonomy and sends a normalized subject/message pair.
 */
function initContactForm() {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var MIN_MS_BEFORE_SUBMIT = 2800;
  var SUBMIT_COOLDOWN_MS = 90000;
  var COOLDOWN_STORAGE_KEY = 'gorfed-contact-last-send';
  var formMountedAt = Date.now();
  var resultEl = document.getElementById('contact-form-result');
  var submitBtn = form.querySelector('button[type="submit"]');
  var messageInput = form.querySelector('#contact-message');
  var messageNoteEl = messageInput ? messageInput.parentElement.querySelector('.contact-field-note') : null;
  var endpoint = 'https://api.web3forms.com/submit';
  var accessKey = (form.getAttribute('data-web3forms-key') || '').trim();
  var siteTag = (form.getAttribute('data-site-tag') || 'gorfed.net').trim();
  var messageMin = messageInput ? Number(messageInput.getAttribute('minlength') || '30') : 30;
  var messageMax = messageInput ? Number(messageInput.getAttribute('maxlength') || '8000') : 8000;

  function setResult(text, type) {
    if (!resultEl) return;
    resultEl.textContent = text || '';
    resultEl.classList.remove('is-error', 'is-success');
    if (type === 'error') resultEl.classList.add('is-error');
    if (type === 'success') resultEl.classList.add('is-success');
  }

  function updateMessageCount() {
    if (!messageInput || !messageNoteEl) return;
    var len = messageInput.value.length;
    messageNoteEl.textContent = len + ' / ' + messageMax + ' · min ' + messageMin + ' characters';
  }

  if (messageInput && messageNoteEl) {
    updateMessageCount();
    messageInput.addEventListener('input', updateMessageCount);
  }

  if (!accessKey) {
    setResult('Form is not configured yet. Missing Web3Forms access key.', 'error');
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var elapsed = Date.now() - formMountedAt;
    if (elapsed < MIN_MS_BEFORE_SUBMIT) {
      setResult('Please wait a moment before sending.', 'error');
      return;
    }

    var last = Number(sessionStorage.getItem(COOLDOWN_STORAGE_KEY) || '0');
    if (Date.now() - last < SUBMIT_COOLDOWN_MS) {
      setResult('You recently sent a message. Please wait before sending another.', 'error');
      return;
    }

    var emailInput = form.querySelector('input[name="email"]');
    if (emailInput && typeof emailInput.checkValidity === 'function' && !emailInput.checkValidity()) {
      setResult('Enter a valid email address before sending.', 'error');
      return;
    }

    var honeypot = form.querySelector('input[name="company_website"]');
    if (honeypot && honeypot.value && honeypot.value.trim() !== '') {
      setResult('Message sent.', 'success');
      form.reset();
      updateMessageCount();
      return;
    }

    var fd = new FormData(form);
    var name = String(fd.get('name') || '').trim();
    var email = String(fd.get('email') || '').trim();
    var subjectKey = String(fd.get('subject') || '').trim();
    var subjectSelect = form.querySelector('select[name="subject"]');
    var subjectLabel = subjectSelect && subjectSelect.selectedOptions && subjectSelect.selectedOptions[0]
      ? subjectSelect.selectedOptions[0].textContent.trim()
      : subjectKey;
    var rawMessage = String(fd.get('message') || '').trim();

    if (!name || !email || !subjectKey || !rawMessage) {
      setResult('Complete all required fields before sending.', 'error');
      return;
    }
    if (rawMessage.length < 30) {
      setResult('Message must be at least 30 characters.', 'error');
      return;
    }

    var sendData = new FormData();
    sendData.append('access_key', accessKey);
    sendData.append('name', name);
    sendData.append('email', email);
    sendData.append('subject', '[' + siteTag + '] ' + subjectLabel + ' / ' + name);
    sendData.append('message', 'Topic: ' + subjectLabel + ' (' + subjectKey + ')\n\n' + rawMessage);
    sendData.append('botcheck', 'false');

    if (submitBtn) submitBtn.disabled = true;
    setResult('Sending...', null);

    fetch(endpoint, {
      method: 'POST',
      body: sendData,
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data || {} };
        }).catch(function () {
          return { ok: false, data: {} };
        });
      })
      .then(function (out) {
        if (out.ok && out.data && out.data.success === true) {
          sessionStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now()));
          setResult('Message sent. Expect a reply in a few business days.', 'success');
          form.reset();
          updateMessageCount();
          return;
        }
        var msg =
          out.data && typeof out.data.message === 'string' && out.data.message.trim().length > 0
            ? out.data.message.trim()
            : 'Could not send message right now. Please try again shortly.';
        setResult(msg, 'error');
      })
      .catch(function () {
        setResult('Network error while sending. Please try again shortly.', 'error');
      })
      .finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
  });
}

/**
 * Music page: filter past-performance rows by data-show-type and announce counts to SR.
 * filterLabels keys must stay in sync with <option value> and tr[data-show-type] in music.html.
 */
function initPastShowsFilter() {
  var filterLabels = {
    all: 'All',
    corporate: 'Corporate',
    festival: 'Festival',
    'house-party': 'House Party',
    installation: 'Installation',
    radio: 'Radio',
    rave: 'Rave',
    stream: 'Stream',
    venue: 'Venue',
  };

  var grid = document.getElementById('past-shows-grid');
  var select = document.getElementById('past-shows-filter-select');
  var statusEl = document.getElementById('past-shows-status');
  if (!grid || !select) return;

  var cards = grid.querySelectorAll('tbody tr.past-show-row[data-show-type]');
  var total = cards.length;
  if (total === 0) return;

  function filterLabel(value) {
    return Object.prototype.hasOwnProperty.call(filterLabels, value) ? filterLabels[value] : value;
  }

  function isAllowedFilterValue(value) {
    return Object.prototype.hasOwnProperty.call(filterLabels, value);
  }

  function applyFilter(value) {
    if (!isAllowedFilterValue(value)) return;
    var visible = 0;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var type = card.getAttribute('data-show-type');
      var show = value === 'all' || type === value;
      if (show) {
        card.classList.remove('past-shows-card--filtered-out');
      } else {
        card.classList.add('past-shows-card--filtered-out');
      }
      if (show) visible++;
    }
    if (statusEl) {
      statusEl.textContent =
        'Showing ' +
        visible +
        ' of ' +
        total +
        ' past performances. ' +
        filterLabel(value) +
        ' filter selected.';
    }
  }

  function onFilterChange() {
    var v = select.value;
    if (isAllowedFilterValue(v)) applyFilter(v);
  }

  select.addEventListener('change', onFilterChange);

  applyFilter(select.value || 'all');
}

/**
 * Sortable tables: header buttons toggle aria-sort and reorder tbody rows.
 * Press uses column 0 = article title, 1 = publication, 2 = date (3 columns).
 * Music uses name, artist/act, location, date (4 columns when cells.length === 4).
 * Tie-breakers use locale-aware string compare or ISO date strings on data-sort-date.
 */
function initSortableDataTable(wrapId, rowSelector, defaultKey, defaultDir) {
  var grid = document.getElementById(wrapId);
  if (!grid) return;
  var table = grid.querySelector('table.past-shows-table');
  var tbody = grid.querySelector('tbody');
  if (!table || !tbody) return;

  var buttons = table.querySelectorAll('.past-shows-sort-btn');

  function clearHeaderSort() {
    table.querySelectorAll('th[scope="col"]').forEach(function (th) {
      th.setAttribute('aria-sort', 'none');
    });
  }

  function cmpStr(a, b) {
    return (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' });
  }

  function sortRows(key, dir) {
    var rows = Array.prototype.slice.call(tbody.querySelectorAll(rowSelector));
    var mul = dir === 'asc' ? 1 : -1;
    rows.sort(function (a, b) {
      var cmp = 0;
      var da = a.getAttribute('data-sort-date') || '';
      var db = b.getAttribute('data-sort-date') || '';
      var musicCols = a.cells.length === 4 && b.cells.length === 4;
      var locIdx = musicCols ? 2 : 1;
      if (key === 'date') {
        cmp = da < db ? -1 : da > db ? 1 : 0;
        if (cmp === 0) cmp = cmpStr(a.cells[0].textContent, b.cells[0].textContent);
      } else if (key === 'name') {
        cmp = cmpStr(a.cells[0].textContent, b.cells[0].textContent);
        if (cmp === 0) cmp = da < db ? -1 : da > db ? 1 : 0;
      } else if (key === 'artist') {
        if (!musicCols) return 0;
        cmp = cmpStr(a.cells[1].textContent, b.cells[1].textContent);
        if (cmp === 0) cmp = da < db ? -1 : da > db ? 1 : 0;
      } else {
        cmp = cmpStr(a.cells[locIdx].textContent, b.cells[locIdx].textContent);
        if (cmp === 0) cmp = da < db ? -1 : da > db ? 1 : 0;
      }
      return mul * cmp;
    });
    rows.forEach(function (row) {
      tbody.appendChild(row);
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-sort-key');
      if (!key) return;
      var th = btn.closest('th');
      if (!th) return;
      var current = th.getAttribute('aria-sort') || 'none';
      var dir;
      if (current === 'ascending') dir = 'desc';
      else if (current === 'descending') dir = 'asc';
      else dir = key === 'date' ? 'desc' : 'asc';

      clearHeaderSort();
      th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
      sortRows(key, dir);
    });
  });

  if (defaultKey && defaultDir) {
    sortRows(defaultKey, defaultDir);
    var thClass =
      defaultKey === 'date'
        ? '.past-shows-th--date'
        : defaultKey === 'location'
          ? '.past-shows-th--location'
          : defaultKey === 'artist'
            ? '.past-shows-th--artist'
            : '.past-shows-th--event';
    var thInit = table.querySelector(thClass);
    if (thInit) {
      clearHeaderSort();
      thInit.setAttribute('aria-sort', defaultDir === 'asc' ? 'ascending' : 'descending');
    }
    return;
  }

  var dateThInit = table.querySelector('.past-shows-th--date');
  if (dateThInit && dateThInit.getAttribute('aria-sort') === 'descending') {
    sortRows('date', 'desc');
  }
}

/**
 * Makes entire table rows activate the first in-row link (press citations, etc.).
 * Clicks on the real anchor bubble normally; modifier keys open a new tab with opener nulled.
 * Rows whose href fails validation are left non-clickable so behaviour matches expectations.
 */
function initClickableTableRows(wrapId, rowSelector) {
  var grid = document.getElementById(wrapId);
  if (!grid) return;
  var tbody = grid.querySelector('tbody');
  if (!tbody) return;

  tbody.querySelectorAll(rowSelector).forEach(function (row) {
    var link = row.querySelector('a[href]');
    if (!link) return;
    var rawHref = link.getAttribute('href');
    if (!isSafeNavigationHref(rawHref)) return;

    row.classList.add('past-shows-row--clickable');

    row.addEventListener('click', function (ev) {
      if (ev.defaultPrevented) return;
      if (ev.button !== 0) return;
      var t = ev.target;
      if (t && t.closest && t.closest('a')) return;
      if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) {
        var tgt = link.target || '_self';
        var w = window.open(link.href, tgt);
        if (w && tgt === '_blank') w.opener = null;
        return;
      }
      link.click();
    });
  });
}

(() => {
  'use strict';

  const EVENTS = {
    preload: Date.UTC(2026, 10, 12, 0, 0, 0),
    launch: Date.UTC(2026, 10, 19, 0, 0, 0),
    preloadStart: Date.UTC(2026, 5, 19, 0, 0, 0),
    developmentStart: Date.UTC(2022, 1, 4, 0, 0, 0),
    netflixStart: Date.UTC(2026, 7, 27, 19, 0, 0),
    youtubeStart: Date.UTC(2026, 7, 28, 1, 0, 0)
  };

  const STORAGE_PREFIX = 'gta-vi-launch-hub:';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function formatDate(value) {
    if (!value) return 'Undated';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getStore(key, fallback = []) {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_PREFIX + key));
      return Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function setStore(key, value) {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  }

  function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function showToast(message, kind = 'success') {
    const region = $('#toastRegion');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.dataset.kind = kind;
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  function setDigits(card, milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const values = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60
    };
    Object.entries(values).forEach(([unit, value]) => {
      const node = $(`[data-cd-${unit}]`, card);
      if (node) node.textContent = String(value).padStart(2, '0');
    });
  }

  function updateCountdowns() {
    const now = Date.now();
    $$('[data-countdown-event]').forEach(card => {
      const eventName = card.dataset.countdownEvent;
      const target = EVENTS[eventName];
      if (!target) return;
      const difference = target - now;
      setDigits(card, difference);
      const status = $('[data-cd-status]', card);
      if (!status) return;
      if (difference <= 0) {
        status.textContent = card.dataset.completedStatus || 'Available now';
        status.dataset.statusKind = 'live';
      } else {
        status.textContent = `Opens in ${Math.ceil(difference / 86400000)} day${Math.ceil(difference / 86400000) === 1 ? '' : 's'}`;
        status.dataset.statusKind = 'upcoming';
      }
    });
  }

  function updateProgress() {
    const now = Date.now();
    $$('[data-progress-event]').forEach(card => {
      const eventName = card.dataset.progressEvent;
      const start = eventName === 'preload' ? EVENTS.preloadStart : EVENTS.developmentStart;
      const end = EVENTS[eventName];
      const percent = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
      const rounded = Math.round(percent);
      const label = `${rounded}% complete`;
      const number = $('[data-progress-percent]', card);
      const fill = $('[data-progress-fill]', card);
      const text = $('[data-progress-label]', card);
      const bar = $('.progress-track', card);
      if (number) number.textContent = `${rounded}%`;
      if (fill) fill.style.width = `${percent}%`;
      if (text) text.textContent = now >= end ? 'Target date reached.' : label;
      if (bar) bar.setAttribute('aria-valuenow', String(rounded));
    });
  }

  function updateNetflixWindow() {
    const card = $('[data-netflix-window]');
    if (!card) return;
    const now = Date.now();
    const status = $('[data-nw-status]', card);
    const fill = $('[data-nw-fill]', card);
    const time = $('[data-nw-time]', card);
    const bar = $('.progress-track', card);
    const total = EVENTS.youtubeStart - EVENTS.netflixStart;
    const progress = Math.max(0, Math.min(100, ((now - EVENTS.netflixStart) / total) * 100));
    if (fill) fill.style.width = `${progress}%`;
    if (bar) bar.setAttribute('aria-valuenow', String(Math.round(progress)));
    if (now < EVENTS.netflixStart) {
      if (status) status.textContent = 'Premiere has not started';
      if (time) time.textContent = 'Scheduled for August 27, 2026';
    } else if (now < EVENTS.youtubeStart) {
      if (status) status.textContent = 'Netflix exclusive window is live';
      if (time) time.textContent = 'YouTube release follows at 01:00 UTC';
    } else {
      if (status) status.textContent = 'Available on Rockstar and YouTube';
      if (time) time.textContent = 'Exclusive window complete';
    }
  }

  function initNav() {
    const button = $('#navToggle');
    const nav = $('#primaryNav');
    if (!button || !nav) return;
    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('is-open', !isOpen);
    });
    $$('a', nav).forEach(link => link.addEventListener('click', () => {
      button.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }));
  }

  function initFilters() {
    const setups = [
      ['#characterSearch', '#characterCategory', '#characterCastGrid', '.character-card'],
      ['#locationSearch', '#locationCategory', '#leonidaOfficialGrid', '.location-card']
    ];
    setups.forEach(([searchSelector, categorySelector, gridSelector, cardSelector]) => {
      const search = $(searchSelector), category = $(categorySelector), grid = $(gridSelector);
      if (!search || !category || !grid) return;
      const filter = () => {
        const term = search.value.trim().toLowerCase();
        const selected = category.value;
        $$(cardSelector, grid).forEach(card => {
          const matchesTerm = card.textContent.toLowerCase().includes(term);
          const matchesCategory = selected === 'all' || card.dataset.category === selected;
          card.hidden = !(matchesTerm && matchesCategory);
        });
      };
      search.addEventListener('input', filter);
      category.addEventListener('change', filter);
    });
  }

  function initCollection(config) {
    const form = $(config.form);
    const grid = $(config.grid);
    if (!form || !grid) return;
    let editingId = null;

    function render() {
      const items = getStore(config.key);
      grid.innerHTML = items.length ? items.map(item => config.template(item)).join('') : `<p class="empty-state">No ${config.emptyLabel} added yet.</p>`;
      $$('[data-edit]', grid).forEach(button => button.addEventListener('click', () => startEdit(button.dataset.edit)));
      $$('[data-delete]', grid).forEach(button => button.addEventListener('click', () => {
        const id = button.dataset.delete;
        setStore(config.key, getStore(config.key).filter(item => item.id !== id));
        render();
        showToast('Entry deleted.');
      }));
    }

    function startEdit(id) {
      const item = getStore(config.key).find(entry => entry.id === id);
      if (!item) return;
      editingId = id;
      Object.entries(item).forEach(([key, value]) => {
        const input = $(`[name="${key}"]`, form);
        if (input) input.value = value || '';
      });
      const submit = $('[type="submit"]', form);
      const cancel = $('[type="button"]', form);
      if (submit) submit.textContent = 'Save changes';
      if (cancel) cancel.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const item = Object.fromEntries(new FormData(form).entries());
      const items = getStore(config.key);
      if (editingId) {
        const index = items.findIndex(entry => entry.id === editingId);
        if (index !== -1) items[index] = { ...items[index], ...item };
        showToast('Changes saved.');
      } else {
        items.unshift({ id: makeId(), ...item });
        showToast('Entry added.');
      }
      setStore(config.key, items);
      form.reset();
      editingId = null;
      const submit = $('[type="submit"]', form);
      const cancel = $('[type="button"]', form);
      if (submit) submit.textContent = config.submitLabel;
      if (cancel) cancel.hidden = true;
      render();
    });

    const cancel = $('[type="button"]', form);
    if (cancel) cancel.addEventListener('click', () => {
      editingId = null;
      form.reset();
      cancel.hidden = true;
      const submit = $('[type="submit"]', form);
      if (submit) submit.textContent = config.submitLabel;
    });

    render();
  }

  function initLightbox() {
    const box = $('#lightbox');
    const image = $('#lightboxImage');
    const title = $('#lightboxCaptionTitle');
    const description = $('#lightboxCaptionDesc');
    const close = $('#lightboxClose');
    if (!box || !image || !close) return;
    const closeBox = () => { box.hidden = true; image.src = ''; };
    close.addEventListener('click', closeBox);
    box.addEventListener('click', event => { if (event.target === box) closeBox(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !box.hidden) closeBox(); });
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-lightbox-src]');
      if (!button) return;
      image.src = button.dataset.lightboxSrc;
      image.alt = button.dataset.lightboxAlt || '';
      if (title) title.textContent = button.dataset.lightboxTitle || '';
      if (description) description.textContent = button.dataset.lightboxDesc || '';
      box.hidden = false;
    });
  }

  function initClearData() {
    const button = $('#clearDataBtn');
    if (!button) return;
    button.addEventListener('click', () => {
      if (!window.confirm('Clear all GTA VI Launch Hub data saved in this browser?')) return;
      Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX)).forEach(key => localStorage.removeItem(key));
      window.location.reload();
    });
  }

  function initObsMode() {
    if (new URLSearchParams(window.location.search).get('mode') === 'obs') document.body.classList.add('obs-mode');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initObsMode();
    initNav();
    initFilters();
    initLightbox();
    initClearData();

    initCollection({
      key: 'watchlist', form: '#characterForm', grid: '#characterWatchlistGrid', emptyLabel: 'watchlist entries', submitLabel: 'Add to watchlist',
      template: item => `<article class="glass-card character-card"><div class="character-card-head"><h4>${escapeHTML(item.name)}</h4><span class="badge badge-fan">Fan-added</span></div><p class="character-role">${escapeHTML(item.category || 'Watchlist')}</p><p>${escapeHTML(item.notes || 'No notes added.')}</p><div class="card-actions"><button class="btn btn-ghost btn-small" type="button" data-edit="${item.id}">Edit</button><button class="btn btn-danger btn-small" type="button" data-delete="${item.id}">Delete</button></div></article>`
    });

    initCollection({
      key: 'locations', form: '#locationForm', grid: '#leonidaCustomGrid', emptyLabel: 'custom locations', submitLabel: 'Add location',
      template: item => `<article class="glass-card location-card"><div class="character-card-head"><h4>${escapeHTML(item.name)}</h4><span class="badge badge-fan">Fan-added</span></div><p class="character-role">${escapeHTML(item.category || 'Other')}</p><p>${escapeHTML(item.poi || '')}</p><p>${escapeHTML(item.notes || 'No notes added.')}</p><div class="card-actions"><button class="btn btn-ghost btn-small" type="button" data-edit="${item.id}">Edit</button><button class="btn btn-danger btn-small" type="button" data-delete="${item.id}">Delete</button></div></article>`
    });

    initCollection({
      key: 'trailers', form: '#trailerForm', grid: '#trailerGrid', emptyLabel: 'trailers', submitLabel: 'Add trailer',
      template: item => `<article class="glass-card"><h4>${escapeHTML(item.title)}</h4><p class="gallery-cat">${escapeHTML(formatDate(item.date))}</p><p>${escapeHTML(item.description || 'No description added.')}</p>${item.videoUrl ? `<p><a href="${escapeHTML(item.videoUrl)}" target="_blank" rel="noopener">Open trusted video</a></p>` : ''}<div class="card-actions"><button class="btn btn-ghost btn-small" type="button" data-edit="${item.id}">Edit</button><button class="btn btn-danger btn-small" type="button" data-delete="${item.id}">Delete</button></div></article>`
    });

    initCollection({
      key: 'screenshots', form: '#screenshotForm', grid: '#screenshotGrid', emptyLabel: 'screenshots', submitLabel: 'Add screenshot',
      template: item => `<article class="gallery-item"><button class="gallery-thumb-btn" type="button" data-lightbox-src="${escapeHTML(item.imageUrl)}" data-lightbox-alt="${escapeHTML(item.alt)}" data-lightbox-title="${escapeHTML(item.title)}" data-lightbox-desc="${escapeHTML(item.description || '')}"><div class="gallery-thumb-wrap"><img src="${escapeHTML(item.imageUrl)}" alt="${escapeHTML(item.alt)}"></div></button><div class="gallery-body"><h4>${escapeHTML(item.title)}</h4><p class="gallery-cat">${escapeHTML(item.category)}</p><p class="gallery-desc">${escapeHTML(item.description || '')}</p><div class="card-actions"><button class="btn btn-ghost btn-small" type="button" data-edit="${item.id}">Edit</button><button class="btn btn-danger btn-small" type="button" data-delete="${item.id}">Delete</button></div></div></article>`
    });

    initCollection({
      key: 'news', form: '#newsForm', grid: '#newsGrid', emptyLabel: 'news items', submitLabel: 'Add news item',
      template: item => `<article class="glass-card"><div class="character-card-head"><h4>${escapeHTML(item.headline)}</h4><span class="badge badge-${item.category === 'official' ? 'official' : 'fan'}">${escapeHTML(item.category || 'News')}</span></div><p class="gallery-cat">${escapeHTML(formatDate(item.date))}${item.sourceName ? ` · ${escapeHTML(item.sourceName)}` : ''}</p><p>${escapeHTML(item.description || '')}</p>${item.sourceUrl ? `<p><a href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener">Source</a></p>` : ''}<div class="card-actions"><button class="btn btn-ghost btn-small" type="button" data-edit="${item.id}">Edit</button><button class="btn btn-danger btn-small" type="button" data-delete="${item.id}">Delete</button></div></article>`
    });

    initCollection({
      key: 'theories', form: '#theoryForm', grid: '#theoryGrid', emptyLabel: 'theories', submitLabel: 'Add theory',
      template: item => `<article class="glass-card"><div class="character-card-head"><h4>${escapeHTML(item.title)}</h4><span class="badge badge-rumor">${escapeHTML(item.status || 'Unconfirmed')}</span></div><p class="gallery-cat">${escapeHTML(item.category || 'Other')}${item.author ? ` · ${escapeHTML(item.author)}` : ''}</p><p>${escapeHTML(item.description || '')}</p>${item.evidenceUrl ? `<p><a href="${escapeHTML(item.evidenceUrl)}" target="_blank" rel="noopener">Evidence link</a></p>` : ''}<div class="card-actions"><button class="btn btn-ghost btn-small" type="button" data-edit="${item.id}">Edit</button><button class="btn btn-danger btn-small" type="button" data-delete="${item.id}">Delete</button></div></article>`
    });

    initCollection({
      key: 'summary', form: '#summaryForm', grid: '#summaryTableBody', emptyLabel: 'summary entries', submitLabel: 'Save entry',
      template: item => `<tr><td>${escapeHTML(item.timestamp)}</td><td>${escapeHTML(item.whatHappens || '')}</td><td>${escapeHTML(item.whyMatters || '')}</td><td>${escapeHTML(item.category || '')}</td><td>${escapeHTML(item.status || '')}</td><td><div class="table-actions"><button class="btn btn-ghost btn-small" type="button" data-edit="${item.id}">Edit</button><button class="btn btn-danger btn-small" type="button" data-delete="${item.id}">Delete</button></div></td></tr>`
    });

    updateCountdowns();
    updateProgress();
    updateNetflixWindow();
    window.setInterval(updateCountdowns, 1000);
    window.setInterval(() => { updateProgress(); updateNetflixWindow(); }, 30000);
  });
})();

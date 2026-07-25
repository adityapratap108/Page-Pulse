'use strict';

/* ─── DOM References ──────────────────────────────────────────────────────── */
const form          = document.getElementById('audit-form');
const urlInput      = document.getElementById('url-input');
const auditBtn      = document.getElementById('audit-btn');
const btnText       = document.getElementById('btn-text');
const btnIconDef    = document.getElementById('btn-icon-default');
const btnIconSpin   = document.getElementById('btn-icon-spinner');
const errorBanner   = document.getElementById('error-banner');
const errorTitle    = document.getElementById('error-title');
const errorMessage  = document.getElementById('error-message');
const errorClose    = document.getElementById('error-close');
const skeletonGrid  = document.getElementById('skeleton-grid');
const resultsSection= document.getElementById('results-section');
const metricsGrid   = document.getElementById('metrics-grid');
const resultsUrlText= document.getElementById('results-url-text');
const summaryText   = document.getElementById('summary-text');

/* ─── Error Code → User-Friendly Titles ────────────────────────────────────── */
const ERROR_TITLES = {
  INVALID_URL:   'Invalid URL',
  NOT_HTML:      'Non-HTML Content',
  TIMEOUT:       'Request Timed Out',
  NETWORK_ERROR: 'Network Error',
  SERVER_ERROR:  'Server Error',
};

/* ─── SVG Icons ───────────────────────────────────────────────────────────── */
const ICONS = {
  statusCode: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`,
  responseTime:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  title:       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
  metaDesc:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="14" y2="14"/></svg>`,
  h1Count:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 6v12"/><path d="M12 6v12"/><path d="M17 10l3-2v8"/></svg>`,
  missingAlt:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  wordCount:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
};

/* ─── State Helpers ──────────────────────────────────────────────────────────*/
function setLoading(loading) {
  auditBtn.disabled = loading;
  auditBtn.setAttribute('aria-busy', loading);
  btnIconDef.style.display  = loading ? 'none' : '';
  btnIconSpin.style.display = loading ? ''     : 'none';
  btnText.textContent = loading ? 'Auditing…' : 'Audit';
  skeletonGrid.classList.toggle('visible', loading);
  if (loading) {
    resultsSection.classList.remove('visible');
    hideError();
  }
}

function showError(code, message) {
  const title = ERROR_TITLES[code] || 'Something went wrong';
  errorTitle.textContent   = title;
  errorMessage.textContent = message;
  errorBanner.classList.add('visible');
  errorBanner.focus();
}

function hideError() {
  errorBanner.classList.remove('visible');
}

/* ─── Status helpers ─────────────────────────────────────────────────────────*/
function httpStatusCategory(code) {
  if (code >= 200 && code < 300) return 'good';
  if (code >= 300 && code < 400) return 'warn';
  return 'bad';
}

function responseTimeCategory(ms) {
  if (ms < 800)  return 'good';
  if (ms < 2500) return 'warn';
  return 'bad';
}

function h1Category(count) {
  if (count === 1) return 'good';
  if (count === 0) return 'bad';
  return 'warn'; // multiple H1s
}

function missingAltCategory(count) {
  if (count === 0) return 'good';
  if (count <= 3)  return 'warn';
  return 'bad';
}

function wordCountCategory(count) {
  if (count >= 300) return 'good';
  if (count >= 100) return 'warn';
  return 'bad';
}

/* ─── Card Builder ────────────────────────────────────────────────────────── */
function buildCard({ icon, label, value, subtext, status, wide, isText }) {
  const card = document.createElement('div');
  card.className = `metric-card status-${status}${wide ? ' wide' : ''}${isText ? ' text-card' : ''}`;
  const isEmpty = (value === null || value === '' || value === 'None');
  const displayValue = isEmpty ? 'Not set' : value;

  card.innerHTML = `
    <div class="card-content">
      <div class="card-icon-wrapper" aria-hidden="true">${icon}</div>
      <div class="card-label">${label}</div>
      <div class="card-value${isText && isEmpty ? ' empty' : ''}">${escapeHtml(displayValue)}</div>
      ${subtext ? `<div class="card-subtext">${escapeHtml(subtext)}</div>` : ''}
    </div>
  `;
  return card;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── Render Results ─────────────────────────────────────────────────────────*/
function renderResults(url, data) {
  metricsGrid.innerHTML = '';

  const cards = [
    {
      icon:   ICONS.statusCode,
      label:  'HTTP Status',
      value:  String(data.statusCode),
      subtext: data.statusCode >= 200 && data.statusCode < 300
                ? 'Page loaded successfully'
                : data.statusCode >= 300 && data.statusCode < 400
                  ? 'Page redirected'
                  : 'Non-success response',
      status: httpStatusCategory(data.statusCode),
    },
    {
      icon:   ICONS.responseTime,
      label:  'Response Time',
      value:  `${data.responseTime} ms`,
      subtext: data.responseTime < 800
                ? 'Excellent load speed'
                : data.responseTime < 2500
                  ? 'Acceptable — consider optimising'
                  : 'Slow — users may bounce',
      status: responseTimeCategory(data.responseTime),
    },
    {
      icon:   ICONS.h1Count,
      label:  'H1 Tags',
      value:  String(data.h1Count),
      subtext: data.h1Count === 1
                ? 'Perfect — exactly one H1'
                : data.h1Count === 0
                  ? 'Missing — add an H1 tag'
                  : `${data.h1Count} H1 tags — should be exactly 1`,
      status: h1Category(data.h1Count),
    },
    {
      icon:   ICONS.missingAlt,
      label:  'Images Missing Alt',
      value:  String(data.missingAltCount),
      subtext: data.missingAltCount === 0
                ? 'All images have alt text'
                : `${data.missingAltCount} image${data.missingAltCount !== 1 ? 's' : ''} lack accessibility labels`,
      status: missingAltCategory(data.missingAltCount),
    },
    {
      icon:   ICONS.wordCount,
      label:  'Word Count',
      value:  data.wordCount.toLocaleString(),
      subtext: data.wordCount >= 300
                ? 'Good content depth'
                : data.wordCount >= 100
                  ? 'Moderate — consider expanding'
                  : 'Thin content — add more text',
      status: wordCountCategory(data.wordCount),
    },
    {
      icon:   ICONS.title,
      label:  'Page Title',
      value:  data.title || 'Not set',
      subtext: data.title
                ? `${data.title.length} characters${data.title.length > 60 ? ' — consider shortening (>60)' : data.title.length < 30 ? ' — consider expanding (<30)' : ' — good length'}`
                : 'Missing — add a <title> tag',
      status: data.title ? (data.title.length >= 30 && data.title.length <= 60 ? 'good' : 'warn') : 'bad',
      wide: true,
      isText: true,
    },
    {
      icon:   ICONS.metaDesc,
      label:  'Meta Description',
      value:  data.metaDescription || 'Not set',
      subtext: data.metaDescription
                ? `${data.metaDescription.length} characters${data.metaDescription.length > 160 ? ' — too long (>160)' : data.metaDescription.length < 70 ? ' — consider expanding (<70)' : ' — good length'}`
                : 'Missing — add a meta description',
      status: data.metaDescription ? (data.metaDescription.length >= 70 && data.metaDescription.length <= 160 ? 'good' : 'warn') : 'bad',
      wide: true,
      isText: true,
    },
  ];

  cards.forEach((cfg) => {
    metricsGrid.appendChild(buildCard(cfg));
  });

  // URL badge
  resultsUrlText.textContent = url;

  // Summary bar
  const issues = [
    data.h1Count !== 1,
    data.missingAltCount > 0,
    data.wordCount < 300,
    !data.title,
    !data.metaDescription,
  ].filter(Boolean).length;

  summaryText.textContent = issues === 0
    ? '🎉 No critical SEO issues detected!'
    : `⚠️ ${issues} potential SEO issue${issues !== 1 ? 's' : ''} found — review highlighted metrics above.`;

  resultsSection.classList.add('visible');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Form Submit ─────────────────────────────────────────────────────────── */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();

  if (!url) {
    showError('INVALID_URL', 'Please enter a URL before auditing.');
    urlInput.focus();
    return;
  }

  setLoading(true);

  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const json = await res.json();

    if (!res.ok) {
      showError(json.error || 'SERVER_ERROR', json.message || 'An unexpected error occurred.');
      return;
    }

    renderResults(url, json.data);
  } catch (err) {
    // Network-level errors (server down, CORS, etc.)
    showError('NETWORK_ERROR', 'Could not reach the Page Pulse server. Is it running?');
  } finally {
    setLoading(false);
  }
});

/* ─── Dismiss error ──────────────────────────────────────────────────────── */
errorClose.addEventListener('click', hideError);

/* ─── Allow Enter key in input ───────────────────────────────────────────── */
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') form.dispatchEvent(new Event('submit', { cancelable: true }));
});

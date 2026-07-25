'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const TIMEOUT_MS = 5000;

/**
 * Fetches a URL and returns its HTML content along with metadata.
 * Enforces a 5-second timeout and validates content-type.
 *
 * @param {string} url
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<{ html: string, statusCode: number, responseTime: number }>}
 * @throws {Error} with a `code` property for structured error handling
 */
async function fetchPage(url, timeoutMs = TIMEOUT_MS) {
  const startTime = Date.now();

  let response;
  try {
    response = await axios.get(url, {
      timeout: timeoutMs,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; PagePulseBot/1.0; +https://pagepulse.dev)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      // Return raw response even for 4xx/5xx so we can inspect status codes
      validateStatus: () => true,
    });
  } catch (err) {
    // Axios timeout fires a ECONNABORTED or ERR_CANCELED / ETIMEDOUT error
    if (
      err.code === 'ECONNABORTED' ||
      err.code === 'ERR_CANCELED' ||
      err.code === 'ETIMEDOUT' ||
      (err.message && err.message.toLowerCase().includes('timeout'))
    ) {
      const timeoutError = new Error(
        `Request to "${url}" timed out after ${timeoutMs}ms.`
      );
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }

    // Generic network / DNS errors
    const networkError = new Error(
      `Network error while fetching "${url}": ${err.message}`
    );
    networkError.code = 'NETWORK_ERROR';
    throw networkError;
  }

  const responseTime = Date.now() - startTime;

  // Validate content-type — must be text/html
  const contentType = (response.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('text/html')) {
    const typeError = new Error(
      `Expected "text/html" but received "${contentType}" for "${url}".`
    );
    typeError.code = 'NOT_HTML';
    typeError.statusCode = response.status;
    throw typeError;
  }

  return {
    html: response.data,
    statusCode: response.status,
    responseTime,
  };
}

/**
 * Parses an HTML string and extracts SEO-relevant metrics.
 *
 * @param {string} html - Raw HTML string.
 * @param {number} responseTime - Response time in milliseconds.
 * @param {number} statusCode - HTTP status code of the fetched page.
 * @returns {object} Parsed audit metrics.
 */
function parsePage(html, responseTime, statusCode) {
  const $ = cheerio.load(html || '');

  // Title
  const title = $('title').first().text().trim() || null;

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[name="Description"]').attr('content')?.trim() ||
    null;

  // H1 count
  const h1Count = $('h1').length;

  // Images missing alt text
  let missingAltCount = 0;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt.trim() === '') {
      missingAltCount++;
    }
  });

  // Word count — extract visible body text
  // Remove scripts, styles, noscript, and hidden elements
  $('script, style, noscript, [aria-hidden="true"]').remove();
  const bodyText = ($('body').text() || $('html').text()).replace(/\s+/g, ' ').trim();
  const wordCount = bodyText
    ? bodyText
        .split(/\s+/)
        .filter((w) => w.length > 0).length
    : 0;

  return {
    statusCode,
    responseTime,
    title,
    metaDescription,
    h1Count,
    missingAltCount,
    wordCount,
  };
}

/**
 * Main orchestrator: fetches a URL and returns the full audit result.
 *
 * @param {string} url
 * @returns {Promise<object>} Audit result object
 * @throws Structured errors with `.code` for the API layer to translate.
 */
async function auditUrl(url) {
  const { html, statusCode, responseTime } = await fetchPage(url);
  const metrics = parsePage(html, responseTime, statusCode);
  return metrics;
}

module.exports = { fetchPage, parsePage, auditUrl };

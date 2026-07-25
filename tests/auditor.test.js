'use strict';

/**
 * Unit Tests: server/auditor.js — parsePage() and error handling
 *
 * These tests do NOT make real HTTP requests. They exercise:
 *   1. Happy Path — well-formed HTML string parsed correctly
 *   2. Failure Case 1 — non-HTML / malformed HTML gracefully handled
 *   3. Failure Case 2 — timeout/network error propagation
 *
 * IMPORTANT: jest.mock() MUST be declared at the TOP of the file.
 * Jest's babel transform hoists jest.mock() calls before any require/import
 * statements, ensuring auditor.js loads the mocked axios module instead of
 * the real one. Placing jest.mock() inside a describe() block causes it to
 * run AFTER the module is already cached with the real dependency.
 */

// ─── Mock axios at the file level (hoisted by Jest before any require) ────────
jest.mock('axios');
const axios = require('axios');

// ─── Module under test ────────────────────────────────────────────────────────
const { parsePage, fetchPage } = require('../server/auditor');

// ─── 1. Happy Path ───────────────────────────────────────────────────────────
describe('parsePage() — happy path', () => {
  const MOCK_HTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Welcome to Acme Corp — Quality Products</title>
      <meta name="description" content="Acme Corp sells the finest anvils, rocket kits, and bird seed in the world." />
    </head>
    <body>
      <h1>Welcome to Acme Corp</h1>
      <p>We build the best products in the world. Shop now and enjoy quality.</p>
      <p>Our catalog includes anvils, rocket kits, and bird seed — crafted for champions.</p>
      <img src="hero.jpg" alt="Acme hero image" />
      <img src="product.jpg" alt="Product listing" />
      <img src="logo.png" alt="" />        <!-- empty alt → missing -->
      <img src="banner.gif" />             <!-- no alt attr → missing -->
      <img src="thumbnail.webp" alt="Thumbnail" />
    </body>
    </html>
  `;

  const result = parsePage(MOCK_HTML, 342, 200);

  test('extracts HTTP status code correctly', () => {
    expect(result.statusCode).toBe(200);
  });

  test('extracts response time correctly', () => {
    expect(result.responseTime).toBe(342);
  });

  test('extracts page title correctly', () => {
    expect(result.title).toBe('Welcome to Acme Corp — Quality Products');
  });

  test('extracts meta description correctly', () => {
    expect(result.metaDescription).toBe(
      'Acme Corp sells the finest anvils, rocket kits, and bird seed in the world.'
    );
  });

  test('counts H1 tags correctly (1 H1)', () => {
    expect(result.h1Count).toBe(1);
  });

  test('counts images missing alt correctly (2: empty + missing)', () => {
    // img with alt="" and img with no alt attribute both count
    expect(result.missingAltCount).toBe(2);
  });

  test('counts approximate word count (non-zero)', () => {
    // The body has meaningful text — exact count can vary by whitespace trimming
    expect(result.wordCount).toBeGreaterThan(0);
    // Should be a reasonable count for the provided HTML
    expect(result.wordCount).toBeGreaterThanOrEqual(10);
  });
});

// ─── Happy Path: multiple H1s ─────────────────────────────────────────────
describe('parsePage() — multiple H1 tags', () => {
  const MULTI_H1_HTML = `
    <html><head><title>Test</title></head>
    <body><h1>First</h1><h1>Second</h1><h1>Third</h1></body>
    </html>
  `;
  test('counts multiple H1 tags correctly', () => {
    const result = parsePage(MULTI_H1_HTML, 100, 200);
    expect(result.h1Count).toBe(3);
  });
});

// ─── Happy Path: zero H1 ─────────────────────────────────────────────────
describe('parsePage() — no H1 tag', () => {
  test('returns 0 when no H1 present', () => {
    const html = '<html><head><title>No H1</title></head><body><h2>Sub</h2></body></html>';
    const result = parsePage(html, 50, 200);
    expect(result.h1Count).toBe(0);
  });
});

// ─── 2. Failure Case 1 — non-HTML / malformed input ──────────────────────────
describe('parsePage() — malformed / empty HTML', () => {
  test('handles completely empty string without throwing', () => {
    expect(() => parsePage('', 0, 200)).not.toThrow();
  });

  test('returns null title for empty HTML', () => {
    const result = parsePage('', 0, 200);
    expect(result.title).toBeNull();
  });

  test('returns null metaDescription for empty HTML', () => {
    const result = parsePage('', 0, 200);
    expect(result.metaDescription).toBeNull();
  });

  test('returns 0 h1Count for empty HTML', () => {
    const result = parsePage('', 0, 200);
    expect(result.h1Count).toBe(0);
  });

  test('handles null input without throwing', () => {
    expect(() => parsePage(null, 0, 200)).not.toThrow();
  });

  test('handles random binary-like garbage without throwing', () => {
    const garbage = '\x00\x01\x02<not valid>html garbage £££ @#$%';
    expect(() => parsePage(garbage, 0, 200)).not.toThrow();
  });

  test('returns 0 missingAltCount when no images present', () => {
    const html = '<html><body><p>No images here.</p></body></html>';
    const result = parsePage(html, 100, 200);
    expect(result.missingAltCount).toBe(0);
  });

  test('counts all images as missing alt when all lack alt attribute', () => {
    const html = '<html><body><img src="a.jpg"><img src="b.jpg"><img src="c.jpg"></body></html>';
    const result = parsePage(html, 50, 200);
    expect(result.missingAltCount).toBe(3);
  });
});

// ─── 3. Failure Case 2 — timeout / network error from fetchPage() ─────────────
describe('fetchPage() — timeout and network errors', () => {
  // Clear all mocks between tests to avoid state leakage
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('throws a TIMEOUT error when axios times out (ECONNABORTED)', async () => {
    const timeoutError = new Error('timeout of 5000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    axios.get.mockRejectedValueOnce(timeoutError);

    await expect(fetchPage('https://slow-server.example.com', 5000))
      .rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  test('throws a TIMEOUT error when axios fires ERR_CANCELED', async () => {
    const cancelError = new Error('Request aborted');
    cancelError.code = 'ERR_CANCELED';
    axios.get.mockRejectedValueOnce(cancelError);

    await expect(fetchPage('https://slow-server.example.com', 5000))
      .rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  test('throws a NETWORK_ERROR for DNS / connection failures', async () => {
    const dnsError = new Error('getaddrinfo ENOTFOUND nonexistent.invalid');
    dnsError.code = 'ENOTFOUND';
    axios.get.mockRejectedValueOnce(dnsError);

    await expect(fetchPage('https://nonexistent.invalid', 5000))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  test('throws NOT_HTML error when content-type is application/pdf', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/pdf' },
      data: '%PDF-1.4 binary content',
    });

    await expect(fetchPage('https://example.com/file.pdf', 5000))
      .rejects.toMatchObject({ code: 'NOT_HTML' });
  });

  test('throws NOT_HTML error when content-type is application/json', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      data: '{"key":"value"}',
    });

    await expect(fetchPage('https://api.example.com/data', 5000))
      .rejects.toMatchObject({ code: 'NOT_HTML' });
  });

  test('resolves correctly for text/html content-type', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      data: '<html><head><title>OK</title></head><body>Hello</body></html>',
    });

    const result = await fetchPage('https://example.com', 5000);
    expect(result.statusCode).toBe(200);
    expect(result.html).toContain('<title>OK</title>');
    expect(typeof result.responseTime).toBe('number');
  });
});

'use strict';

/**
 * Integration Tests: POST /api/audit
 *
 * Uses Supertest to fire real HTTP requests against the Express app
 * without binding to a port (supertest starts its own ephemeral server).
 *
 * All external HTTP calls (axios inside auditor.js) are mocked via jest.mock.
 */

const request = require('supertest');
const app = require('../server/index');

// Mock auditor module so we never hit the real network in integration tests
jest.mock('../server/auditor');
const { auditUrl } = require('../server/auditor');

const MOCK_RESULT = {
  statusCode: 200,
  responseTime: 312,
  title: 'Example Domain',
  metaDescription: 'This domain is for illustrative examples.',
  h1Count: 1,
  missingAltCount: 0,
  wordCount: 247,
};

// ─── 1. Valid Request — Happy Path ─────────────────────────────────────────
describe('POST /api/audit — valid request', () => {
  beforeEach(() => {
    auditUrl.mockResolvedValue(MOCK_RESULT);
  });

  test('returns HTTP 200 with correct shape', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'https://example.com' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toBe('https://example.com');
    expect(res.body.data).toBeDefined();
  });

  test('response data contains all 7 required metrics', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'https://example.com' });

    const { data } = res.body;
    expect(data).toHaveProperty('statusCode');
    expect(data).toHaveProperty('responseTime');
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('metaDescription');
    expect(data).toHaveProperty('h1Count');
    expect(data).toHaveProperty('missingAltCount');
    expect(data).toHaveProperty('wordCount');
  });

  test('response data values match mock result', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'https://example.com' });

    expect(res.body.data).toMatchObject(MOCK_RESULT);
  });
});

// ─── 2. Failure Case 1 — Malformed URL ─────────────────────────────────────
describe('POST /api/audit — invalid URL', () => {
  test('returns 400 for a plain string (no protocol)', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_URL');
    expect(res.body.message).toBeDefined();
  });

  test('returns 400 for missing url field', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_URL');
  });

  test('returns 400 for empty string URL', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_URL');
  });

  test('returns 400 for ftp:// protocol (not supported)', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'ftp://files.example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_URL');
  });

  test('returns 400 for non-HTML content-type error from auditor', async () => {
    const notHtmlErr = new Error('Expected text/html but got application/pdf');
    notHtmlErr.code = 'NOT_HTML';
    auditUrl.mockRejectedValueOnce(notHtmlErr);

    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'https://example.com/report.pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('NOT_HTML');
  });
});

// ─── 3. Failure Case 2 — Server Timeout ──────────────────────────────────
describe('POST /api/audit — timeout / network errors', () => {
  test('returns 504 when auditor throws TIMEOUT error', async () => {
    const timeoutErr = new Error('Request timed out after 5000ms');
    timeoutErr.code = 'TIMEOUT';
    auditUrl.mockRejectedValueOnce(timeoutErr);

    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'https://slow-server.example.com' });

    expect(res.status).toBe(504);
    expect(res.body.error).toBe('TIMEOUT');
    expect(res.body.message).toContain('timed out');
  });

  test('returns 400 when auditor throws NETWORK_ERROR', async () => {
    const netErr = new Error('DNS lookup failed');
    netErr.code = 'NETWORK_ERROR';
    auditUrl.mockRejectedValueOnce(netErr);

    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'https://nonexistent.invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('NETWORK_ERROR');
  });

  test('returns 500 for unhandled/unexpected errors', async () => {
    auditUrl.mockRejectedValueOnce(new Error('Something completely unexpected'));

    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('SERVER_ERROR');
  });
});

// ─── 4. Other route handling ──────────────────────────────────────────────
describe('Non-existent routes', () => {
  test('returns 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});

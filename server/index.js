'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { isValidUrl } = require('./validator');
const { auditUrl } = require('./auditor');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/audit
 * Body: { "url": "https://example.com" }
 *
 * Responses:
 *   200 – Successful audit
 *   400 – Malformed URL or non-HTML content type
 *   504 – Request timeout
 *   500 – Unexpected server error
 */
app.post('/api/audit', async (req, res) => {
  const { url } = req.body;

  // 1. Validate URL syntax
  const validation = isValidUrl(url);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'INVALID_URL',
      message: validation.reason,
    });
  }

  try {
    const result = await auditUrl(url);
    return res.status(200).json({ success: true, url, data: result });
  } catch (err) {
    // Structured error codes from auditor.js
    switch (err.code) {
      case 'TIMEOUT':
        return res.status(504).json({
          error: 'TIMEOUT',
          message: err.message,
        });

      case 'NOT_HTML':
        return res.status(400).json({
          error: 'NOT_HTML',
          message: err.message,
        });

      case 'NETWORK_ERROR':
        return res.status(400).json({
          error: 'NETWORK_ERROR',
          message: err.message,
        });

      default:
        console.error('[Page Pulse] Unhandled error:', err);
        return res.status(500).json({
          error: 'SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again.',
        });
    }
  }
});

// ─── 404 Fallback ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found.' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[Page Pulse] Global error handler:', err);
  res.status(500).json({
    error: 'SERVER_ERROR',
    message: 'An internal server error occurred.',
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
// Only listen when this module is the entry point (not when required by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Page Pulse running at http://localhost:${PORT}\n`);
  });
}

module.exports = app; // Export for supertest integration tests

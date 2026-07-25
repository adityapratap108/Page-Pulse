# 📡 Page Pulse

> **A lightweight, real-time SEO & web audit tool** — enter any URL and get an instant snapshot of 7 key SEO metrics in a beautiful, modern interface.

![Page Pulse Banner](https://img.shields.io/badge/Page%20Pulse-SEO%20Audit%20Tool-7C3AED?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-30.x-C21325?style=for-the-badge&logo=jest&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

---

## ✨ Features

| Metric | Description |
|--------|-------------|
| 🌐 **HTTP Status** | Actual HTTP response code from the target server |
| ⏱️ **Response Time** | Total round-trip time in milliseconds |
| 📝 **Page Title** | Extracted `<title>` tag content + character-length advice |
| 📋 **Meta Description** | `<meta name="description">` content + length guidance |
| #️⃣ **H1 Count** | Number of `<h1>` tags (should be exactly 1) |
| 🖼️ **Missing Alt Text** | Count of `<img>` tags with no `alt` or empty `alt=""` |
| 📖 **Word Count** | Approximate visible body text word count |

**Frontend highlights:**
- ✅ Dark glassmorphism UI with animated gradient background  
- ✅ Shimmer skeleton loader during requests  
- ✅ Color-coded metric cards (green/amber/red scoring)  
- ✅ Staggered card animations  
- ✅ Accessible (ARIA live regions, semantic HTML)  
- ✅ Fully responsive (mobile-first)

---

## 🚀 Setup & Running

### Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org))
- **npm** v9+ (ships with Node.js)

### 1. Clone the repository

```bash
git clone https://github.com/adityapratap108/Page-Pulse.git
cd Page-Pulse
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The server will start with **Nodemon** (auto-reloads on file changes):

```
🚀 Page Pulse running at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production start

```bash
npm start
```

### 5. Custom port

Set the `PORT` environment variable:

```bash
# Windows PowerShell
$env:PORT=8080; npm start

# macOS / Linux
PORT=8080 npm start
```

---

## 🧪 Running Tests

```bash
# Run all tests (unit + integration)
npm test

# Run with coverage report
npm run test:coverage
```

### Test suites

| File | Type | Coverage |
|------|------|----------|
| `tests/auditor.test.js` | Unit | `parsePage()`, `fetchPage()` error paths |
| `tests/api.test.js` | Integration | Full `POST /api/audit` route |

**Minimum test coverage targets:**
- ✅ Happy path: valid HTML parsed correctly (7 fields)
- ✅ Failure Case 1: malformed/empty HTML handled gracefully
- ✅ Failure Case 2: timeout + network errors propagated correctly

---

## 📡 API Contract

### `POST /api/audit`

Audits a given URL and returns structured SEO metrics.

#### Request

```http
POST /api/audit
Content-Type: application/json
```

```json
{
  "url": "https://example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | `string` | ✅ Yes | Full URL including `http://` or `https://` scheme |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "url": "https://example.com",
  "data": {
    "statusCode": 200,
    "responseTime": 342,
    "title": "Example Domain",
    "metaDescription": "This domain is for illustrative examples.",
    "h1Count": 1,
    "missingAltCount": 0,
    "wordCount": 247
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | `number` | HTTP status code returned by the target page |
| `responseTime` | `number` | Round-trip time in milliseconds |
| `title` | `string \| null` | Content of `<title>` tag, or `null` if absent |
| `metaDescription` | `string \| null` | Content of `<meta name="description">`, or `null` |
| `h1Count` | `number` | Number of `<h1>` elements on the page |
| `missingAltCount` | `number` | Number of images with missing or empty `alt` attribute |
| `wordCount` | `number` | Approximate visible body text word count |

#### Error Responses

##### `400 Bad Request` — Invalid URL syntax

```json
{
  "error": "INVALID_URL",
  "message": "\"not-a-url\" is not a valid URL."
}
```

##### `400 Bad Request` — Non-HTML content

```json
{
  "error": "NOT_HTML",
  "message": "Expected \"text/html\" but received \"application/pdf\" for \"https://example.com/doc.pdf\"."
}
```

##### `400 Bad Request` — Network error

```json
{
  "error": "NETWORK_ERROR",
  "message": "Network error while fetching \"https://nonexistent.invalid\": getaddrinfo ENOTFOUND"
}
```

##### `504 Gateway Timeout` — Request timeout

```json
{
  "error": "TIMEOUT",
  "message": "Request to \"https://slow.example.com\" timed out after 5000ms."
}
```

##### `500 Internal Server Error` — Unexpected error

```json
{
  "error": "SERVER_ERROR",
  "message": "An unexpected error occurred. Please try again."
}
```

---

## 🏗️ Design Decisions

### 1. Pure-Function Architecture for `parsePage()`

**Decision:** The HTML parsing logic in `server/auditor.js` is split into a **pure function** `parsePage(html, responseTime, statusCode)` that accepts a raw HTML string and returns metrics, completely decoupled from HTTP/network concerns.

**Reasoning:** This is a core principle of testability. Because `parsePage` has no I/O side-effects and no external dependencies (it only depends on `cheerio`), unit tests can exercise it directly with mock HTML strings — no HTTP mocking, no spinning up servers, no `nock` or `msw` needed. The `fetchPage()` function handles all I/O and is separately tested with axios mocking. This separation also makes it easy to swap the HTTP layer in the future (e.g., switching from `axios` to `node-fetch`) without touching any parsing logic.

---

### 2. Structured Error Codes on the Error Object (`err.code`)

**Decision:** All errors thrown by `auditor.js` carry a string `code` property on the Error object (e.g., `TIMEOUT`, `NOT_HTML`, `NETWORK_ERROR`). The Express route handler in `server/index.js` switches on `err.code` to return the correct HTTP status.

**Reasoning:** Using `err.code` instead of custom exception classes keeps the code simple and avoids complex inheritance hierarchies for a project of this scale. It also means the API layer has an explicit, exhaustive mapping of known error conditions to HTTP status codes, preventing accidental `500` responses for expected failures like timeouts. This pattern mirrors how Node.js's own built-in errors work (e.g., `ENOENT`, `ECONNREFUSED`), making it familiar to Node.js developers. The `default` branch in the switch block acts as a safety net for truly unexpected errors, ensuring the server never crashes.

---

### 3. `require.main === module` Guard for Server Start

**Decision:** `server/index.js` exports `app` and only calls `app.listen()` when the file is the process entry point (`require.main === module`).

**Reasoning:** This is the standard pattern for making an Express app **both** runnable directly (`node server/index.js`) **and** importable by test suites (`const app = require('../server/index')`). When Supertest imports `app`, it starts its own ephemeral TCP server on a random port for each test suite, so there is no port conflict between tests and the dev server. Without this guard, running `npm test` would attempt to bind port 3000, causing `EADDRINUSE` errors if the dev server is also running — or creating hard-to-debug timing issues in CI environments.

---

## 🤖 AI Usage Statement

### How AI was used

This project was drafted and scaffolded using **Antigravity (Claude Sonnet 4.6 / Gemini-based agentic IDE)** as the primary development assistant. The AI's contributions included:

1. **Architecture planning** — The AI proposed the layered architecture (`validator.js` → `auditor.js` → `index.js`) and the pure-function split for `parsePage()`, which was reviewed and approved via an explicit implementation plan step before any code was written.

2. **Code generation** — All source files (`server/`, `public/`, `tests/`) were generated in a single automated pass from the approved plan. The AI wrote the full Jest test suite including `jest.mock('axios')` patterns for testing timeout errors without real network calls.

3. **Design system** — The full CSS design system (~400 lines) including the glassmorphism theme, CSS custom properties, shimmer skeleton animation, staggered card reveal animations, and responsive grid was generated by the AI based on a "premium dark glassmorphism" aesthetic direction.

4. **Documentation** — This README, including the API contract tables, design decision rationale, and test matrix, was generated by the AI as part of the same automated build.

### Manual review & adjustments

- The **implementation plan** was reviewed and explicitly approved by the developer before any code was executed — no files were written without human sign-off on the approach.
- The **test coverage decisions** (which edge cases to cover, what mock HTML to use) were specified in the original project brief and verified against the generated tests.
- The **error code scheme** (`err.code` string approach vs. custom exception classes) was a deliberate architectural decision surfaced during planning and discussed before implementation.
- All generated code was reviewed post-generation, and the dev server was manually smoke-tested against live URLs to verify end-to-end correctness.

---

## 📁 Project Structure

```
Page-Pulse/
├── server/
│   ├── index.js         # Express app entry point + route handlers
│   ├── auditor.js       # Core fetch + HTML parsing logic (pure functions)
│   └── validator.js     # URL validation utility
├── public/
│   ├── index.html       # Single-page frontend (semantic HTML5)
│   ├── style.css        # Full glassmorphism design system
│   └── app.js           # Frontend JS (fetch, DOM, state management)
├── tests/
│   ├── auditor.test.js  # Unit tests for parsePage() + fetchPage()
│   └── api.test.js      # Integration tests via Supertest
├── jest.config.js       # Jest configuration
├── package.json
└── README.md
```

---

## 🔒 Security Notes

- The `User-Agent` header sent to audited sites identifies the bot: `PagePulseBot/1.0`
- A strict **5-second timeout** prevents resource exhaustion from slow targets
- **CORS** is enabled for development convenience; restrict in production using `cors({ origin: 'your-domain.com' })`
- The server does **not** store or log any audited URLs beyond the current request

---

## 📄 License

ISC — see [LICENSE](./LICENSE)

---

<div align="center">
  <strong>Built for <a href="https://digitalheroesco.com" target="_blank">Digital Heroes Training Task</a></strong><br/>
  Page Pulse &copy; 2026
</div>

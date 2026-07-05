# Customer Support Q&A API - Client Verification Report

## Project Overview

This is a portfolio demo of a lightweight customer support Q&A API built with Node.js, Express, and the OpenAI API.

The API accepts a customer support question as JSON, validates the request, combines the question with a structured support context, sends it to OpenAI, and returns a concise customer-facing answer.

The project is designed as a practical backend foundation for:

- Website support chat widgets
- Customer support forms
- FAQ assistants
- Internal helpdesk tools
- Lead intake workflows

## What Was Implemented

- `POST /support/ask` endpoint for customer questions
- `GET /health` endpoint for deployment checks
- OpenAI Chat Completions integration
- Structured system prompt and user prompt builders
- Sample business support context
- Environment-based API key handling through `.env`
- Request validation for missing, empty, and oversized questions
- Error handling for rate limits, provider errors, and timeouts
- Missing API key handling with a clear configuration error
- Small automated test suite for validation, prompt, and error mapping logic
- README with setup, run, and testing instructions
- Portfolio PDF case study
- Technical summary PDF

## Key Files

| File | Purpose |
| --- | --- |
| `README.md` | Setup, API example, test instructions, and project context |
| `.env.example` | Environment variable template |
| `package.json` | Project scripts and dependencies |
| `pnpm-lock.yaml` | Locked dependency versions |
| `src/server.js` | Express server, routes, and API responses |
| `src/openaiClient.js` | OpenAI client and answer generation |
| `src/prompt.js` | System and user prompt builders |
| `src/supportContext.js` | Sample business support context |
| `src/validation.js` | Input validation and API error mapping |
| `test/run-tests.js` | Automated checks for core logic |
| `docs/Customer-Support-QA-API-Case-Study.pdf` | Client-friendly project case study |
| `docs/Customer-Support-QA-API-Technical-Summary.pdf` | Technical implementation summary |
| `docs/upwork-blocks.md` | Ready-to-use Upwork portfolio text blocks |
| `docs/upwork-portfolio-copy.md` | Ready-to-use Upwork portfolio copy |

## How To Verify The Project

### 1. Install Dependencies

```bash
npm install
```

or, if using pnpm:

```bash
pnpm install
```

### 2. Run Automated Tests

```bash
npm test
```

Expected result:

```text
All tests passed.
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then add an OpenAI API key:

```text
OPENAI_API_KEY=your_openai_api_key_here
HOST=127.0.0.1
PORT=3000
OPENAI_MODEL=gpt-4o-mini
REQUEST_TIMEOUT_MS=12000
```

### 4. Start The API

```bash
npm start
```

Expected local URL:

```text
http://127.0.0.1:3000
```

### 5. Check The Health Endpoint

```bash
curl http://127.0.0.1:3000/health
```

Expected response:

```json
{
  "ok": true
}
```

### 6. Test Input Validation

```bash
curl -X POST http://127.0.0.1:3000/support/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"   "}'
```

Expected response:

```json
{
  "error": "invalid_request",
  "message": "Question cannot be empty."
}
```

### 7. Test A Real Support Question

```bash
curl -X POST http://127.0.0.1:3000/support/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Can I book a same-day cleaning?"}'
```

Expected response:

```json
{
  "answer": "...",
  "model": "gpt-4o-mini",
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

Token counts will vary depending on the OpenAI response.

## Verification Already Completed

The packaged version was checked before delivery:

- ZIP archive integrity check passed
- Automated tests passed
- Server syntax check passed
- PDF files are valid, openable, not encrypted, and use A4 pages
- Case study PDF contains 2 pages
- Technical summary PDF contains 1 page
- Distribution package excludes `node_modules` and system files

## Notes

This is a portfolio demo, not a live production deployment. In a real client project, the sample support context should be replaced with the client's approved FAQs, policies, services, escalation rules, and brand tone.


# Customer Support Q&A API

An authenticated REST API that sends customer-support questions to OpenAI with a fixed business context and returns concise JSON answers.

The repository focuses on the backend request-to-provider flow. A chat interface, retrieval-augmented generation (RAG), CRM/helpdesk connectors, and deployment infrastructure are separate integration layers that can be added for a specific business environment.

## Implemented Features

- `POST /support/ask` with bearer-token authentication
- OpenAI Responses API integration
- Maintainable business-policy context kept separate from request handling
- Input validation and a 32 KB request-body limit
- Per-process IP rate limiting for the paid endpoint
- OpenAI timeout, retry, rate-limit, and provider-error handling
- Stable JSON errors for malformed JSON, oversized bodies, unknown routes, and provider failures
- Separate liveness and readiness endpoints
- Security headers through Helmet
- Startup validation for numeric configuration
- Graceful shutdown on `SIGINT` and `SIGTERM`
- Unit and HTTP integration tests with no paid API calls
- GitHub Actions checks on supported Node.js versions

## Request Flow

```text
HTTP request
  -> rate limit
  -> bearer-token authentication
  -> payload validation
  -> fixed support instructions + customer question
  -> OpenAI Responses API
  -> normalized JSON response
```

The grounding mechanism is prompt-based: the model is instructed to answer only from the bundled context. The application does not perform retrieval, citations, or deterministic factual verification of model output.

## Requirements

- Node.js 20 or later
- An OpenAI API key
- A separate random secret used by callers of this API

## Setup

Install the locked dependencies:

```bash
npm ci
```

Create the local configuration:

```bash
cp .env.example .env
```

Set `OPENAI_API_KEY` and generate an independent inbound API secret, for example:

```bash
openssl rand -hex 32
```

Put the generated value in `SUPPORT_API_KEY`. Do not reuse an OpenAI key as the inbound secret and do not commit `.env`.

Start the server:

```bash
npm start
```

The default address is `http://127.0.0.1:3000`.

## API

### Liveness

```http
GET /health/live
```

Returns `200` while the HTTP process is running:

```json
{ "status": "ok" }
```

### Readiness

```http
GET /health/ready
```

Returns `200` when both required secrets are present. Provider reachability is monitored independently through deployment observability.

### Ask a support question

```bash
curl http://127.0.0.1:3000/support/ask \
  --request POST \
  --header "Authorization: Bearer $SUPPORT_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"question":"Can I book a same-day deep cleaning?"}'
```

Successful response shape:

```json
{
  "answer": "Same-day appointments are not guaranteed. Request a quote through the website form.",
  "model": "gpt-4o-mini",
  "usage": {
    "input_tokens": 245,
    "output_tokens": 25,
    "total_tokens": 270
  }
}
```

The answer and token counts vary by provider response.

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | yes | none | Server-side OpenAI credential |
| `SUPPORT_API_KEY` | yes | none | Bearer token required by `POST /support/ask` |
| `OPENAI_MODEL` | no | `gpt-4o-mini` | Configurable OpenAI model ID |
| `HOST` | no | `127.0.0.1` | Listen address |
| `PORT` | no | `3000` | Listen port |
| `REQUEST_TIMEOUT_MS` | no | `12000` | Timeout for each OpenAI request attempt |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Rate-limit window in milliseconds |
| `RATE_LIMIT_MAX` | no | `30` | Requests allowed per IP and window |
| `TRUST_PROXY_HOPS` | no | `0` | Number of trusted reverse proxies used to resolve client IPs |

Set `TRUST_PROXY_HOPS` only when the deployment topology is known. An incorrect value can make IP-based rate limiting unreliable.

## Error Contract

| HTTP status | Error code | Meaning |
| --- | --- | --- |
| `400` | `invalid_request` | Missing, empty, non-string, or oversized question |
| `400` | `invalid_json` | Malformed JSON request body |
| `401` | `unauthorized` | Missing or invalid bearer token |
| `404` | `not_found` | Unknown route |
| `413` | `payload_too_large` | Request body exceeds 32 KB |
| `429` | `rate_limited` | Inbound per-IP limit exceeded |
| `502` | `provider_error` | Unexpected provider failure |
| `503` | `service_not_ready` | Required server configuration is missing |
| `503` | `provider_rate_limited` | OpenAI rate limit reached after retries |
| `504` | `provider_timeout` | OpenAI request timed out or was aborted |

Provider error details are logged server-side and are not returned to callers.

## Verification

```bash
npm test
npm run check
npm audit
```

The test suite covers configuration validation, prompts, request validation, the Responses API adapter, real OpenAI SDK error classes, authentication, health endpoints, malformed JSON, request-size limits, rate limiting, stable provider errors, and 404 responses. Tests use an injected provider function and do not require API credentials.

## Production Rollout

For a production environment:

- replace the fictional context in `src/supportContext.js` with reviewed business data;
- document disclosure and retention rules for data sent to OpenAI;
- use a managed secret store rather than a committed environment file;
- replace the in-memory rate-limit store for multi-instance deployments;
- add centralized logs, metrics, alerts, and cost monitoring;
- run representative answer-quality and prompt-injection evaluations;
- configure TLS and proxy trust at the deployment layer;
- choose and benchmark the model for the actual latency, quality, and cost requirements.

The bundled business context is isolated in one module and can be replaced with approved client content without changing the API contract.

## Portfolio Documents

- [Case Study](output/pdf/Customer-Support-QA-API-Case-Study.pdf)
- [Technical Summary](output/pdf/Customer-Support-QA-API-Technical-Summary.pdf)

Rebuild and validate both documents with:

```bash
python3 -m pip install -r requirements-dev.txt
python3 tools/build_portfolio_pdfs.py
python3 tools/check_portfolio_pdfs.py
```

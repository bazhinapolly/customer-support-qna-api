# Customer Support Q&A API

[![CI](https://github.com/bazhinapolly/customer-support-qna-api/actions/workflows/ci.yml/badge.svg)](https://github.com/bazhinapolly/customer-support-qna-api/actions/workflows/ci.yml)

An authenticated REST API that sends customer-support questions to OpenAI with a fixed business context and returns concise JSON answers.

The repository focuses on the backend request-to-provider flow. A chat interface, retrieval-augmented generation (RAG), CRM/helpdesk connectors, and deployment infrastructure are separate integration layers that can be added for a specific business environment.

## Implemented Features

- `POST /support/ask` with bearer-token authentication
- OpenAI Responses API integration
- Explicit `store: false` provider requests and completed-response enforcement
- Maintainable business-policy context kept separate from request handling
- Input validation and a 32 KB request-body limit
- Best-effort contact-data redaction and sensitive-content rejection before provider calls
- Separate per-process IP limits for failed authentication and authenticated paid requests
- OpenAI timeout, retry, rate-limit, and provider-error handling
- Stable JSON errors for malformed JSON, oversized bodies, unknown routes, and provider failures
- Separate liveness and readiness endpoints
- Security headers through Helmet
- Startup validation for numeric configuration and independent 32-byte inbound secrets
- Graceful shutdown on `SIGINT` and `SIGTERM`
- Unit and HTTP integration tests with no paid API calls
- GitHub Actions checks on supported Node.js versions

## Request Flow

```text
HTTP request
  -> bearer-token authentication
  -> authenticated paid-request rate limit
  -> payload validation
  -> sensitive-content policy + best-effort contact redaction
  -> fixed support instructions + customer question
  -> OpenAI Responses API (store: false)
  -> completed/refusal/incomplete validation
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

The machine-readable HTTP contract is available in [`openapi.yaml`](openapi.yaml) and is validated against the package version, runtime error identifiers, response statuses, and authentication/rate-limit headers by `npm run check`.

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
  "model": "gpt-4o-mini-2024-07-18",
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
| `OPENAI_MODEL` | no | `gpt-4o-mini-2024-07-18` | Pinned default model snapshot |
| `HOST` | no | `127.0.0.1` | Listen address |
| `PORT` | no | `3000` | Listen port |
| `REQUEST_TIMEOUT_MS` | no | `12000` | Timeout for each OpenAI request attempt |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Rate-limit window in milliseconds |
| `RATE_LIMIT_MAX` | no | `30` | Requests allowed per IP and window |
| `AUTH_FAILURE_RATE_LIMIT_MAX` | no | `20` | Failed bearer attempts allowed per IP and window |
| `AUTH_FAILURE_MAX_BUCKETS` | no | `10000` | Maximum in-memory IP buckets before expired/oldest eviction |
| `REDACT_PII` | no | `1` | Best-effort email, phone, and long-number redaction before OpenAI |
| `TRUST_PROXY_HOPS` | no | `0` | Number of trusted reverse proxies used to resolve client IPs |

Set `TRUST_PROXY_HOPS` only when the deployment topology is known. An incorrect value can make IP-based rate limiting unreliable.

## Error Contract

| HTTP status | Error code | Meaning |
| --- | --- | --- |
| `400` | `invalid_request` | Missing, empty, non-string, or oversized question |
| `400` | `invalid_json` | Malformed JSON request body |
| `400` | `sensitive_content` | Medical, payment/account, or credential category detected |
| `401` | `unauthorized` | Missing or invalid bearer token |
| `404` | `not_found` | Unknown route |
| `413` | `payload_too_large` | Request body exceeds 32 KB |
| `429` | `rate_limited` | Inbound per-IP limit exceeded |
| `429` | `auth_rate_limited` | Failed-authentication IP limit exceeded |
| `500` | `internal_error` | Unexpected server failure with no internal details returned |
| `502` | `provider_error` | Unexpected provider failure |
| `503` | `service_not_ready` | Required server configuration is missing |
| `503` | `provider_rate_limited` | OpenAI rate limit reached after retries |
| `504` | `provider_timeout` | OpenAI request timed out or was aborted |

Provider error details are logged server-side and are not returned to callers.

## Privacy and OpenAI data controls

By default, the service applies best-effort pattern-based redaction to email addresses, phone numbers, and long account-like numbers before sending the normalized question to OpenAI. It rejects messages that explicitly contain medical, payment/account, or credential categories without calling the provider. This preprocessing reduces exposure but is not an anonymization guarantee: patterns can miss unusual formats or inferable information, so real intake still requires an approved data policy and channel-specific review.

Every Responses API request explicitly sets `store: false`, which disables Responses application-state storage for this request. This does not by itself remove separate abuse-monitoring logs. OpenAI documents that those logs may contain customer content and are retained for up to 30 days by default; eligible organizations can apply for Modified Abuse Monitoring or Zero Data Retention. Review the current [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) and the selected project's settings before processing real customer data.

The application accepts only `status: completed` responses with non-empty answer text. Incomplete results, refusals, provider errors, and missing output are returned through the stable provider-error contract instead of being presented as successful answers.

## Verification

```bash
npm test
npm run check
npm audit
```

The test suite covers configuration and credential validation, prompts, request validation, preprocessing, provider-call prevention for sensitive content, the Responses API adapter, storage opt-out, incomplete results and refusals, real OpenAI SDK error classes, authentication, readiness/OpenAPI response contracts, malformed JSON, request-size limits, isolated auth and paid-request rate limits, stable provider errors, and 404 responses. Coverage thresholds are enforced locally and in CI. Tests use an injected provider function and do not require API credentials.

The repository also validates the OpenAPI contract and a versioned quality-evaluation dataset. A paid model evaluation can be run without storing answers:

```bash
OPENAI_API_KEY='your-key' OPENAI_MODEL='gpt-4o-mini-2024-07-18' npm run eval:openai
```

The versioned 32-case evaluation set contains eight cases each for factual grounding, escalation, prompt injection, and unsupported boundaries. Its paid runner reports overall and per-category pass rates. No live score is claimed in the repository until the command is run against the pinned model and reviewed for the target business context.

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

## License

[MIT](LICENSE) - Copyright 2026 Polina Bazhina.

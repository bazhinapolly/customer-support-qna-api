# Reproducible HTTP Verification

This local fixture exercises the real Express middleware and public HTTP contract without making an OpenAI request. It uses fictional output and a disposable local-only bearer token.

Start it in one terminal:

```bash
node scripts/local-http-verification.mjs
```

In another terminal, define the printed fixture token:

```bash
export SUPPORT_API_KEY='<paste-the-fixture-token-printed-above>'
export INVALID_SUPPORT_API_KEY='invalid-local-token'
```

## Successful request

```bash
curl -i http://127.0.0.1:3100/support/ask \
  -X POST \
  -H "Authorization: Bearer $SUPPORT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"question":"Can I book a same-day deep cleaning?"}'
```

Expected: `200` and the documented `answer`, `model`, and `usage` fields.

## Unauthorized request and authentication throttling

Run the following command twice:

```bash
curl -i http://127.0.0.1:3100/support/ask \
  -X POST \
  -H "Authorization: Bearer $INVALID_SUPPORT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"question":"What are your hours?"}'
```

Expected: first `401 unauthorized`; second `429 auth_rate_limited` with `Retry-After`, `RateLimit`, and `RateLimit-Policy` headers.

## Provider timeout contract

```bash
curl -i http://127.0.0.1:3100/support/ask \
  -X POST \
  -H "Authorization: Bearer $SUPPORT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"question":"simulate provider timeout"}'
```

Expected: `504 provider_timeout` without internal error details.

Stop the local fixture with `Ctrl+C`. This is deterministic HTTP-contract evidence, not a live model-quality evaluation or client deployment.

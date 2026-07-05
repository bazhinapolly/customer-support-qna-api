# Customer Support Q&A API

A small REST API that uses OpenAI to answer customer support questions from a structured business context.

This portfolio case study is designed for small businesses that want a lightweight AI-assisted support endpoint without building a full chatbot platform. The API accepts a customer question, validates the request, combines it with approved business information, sends it to OpenAI through a controlled support prompt, and returns a concise JSON response.

## What It Does

- Provides one `POST /support/ask` endpoint
- Accepts JSON input with a customer question
- Uses a structured system prompt and support context
- Calls the OpenAI Chat Completions API
- Returns a concise customer-facing support answer
- Validates missing, empty, and oversized input
- Handles OpenAI rate limits, API errors, and request timeouts
- Stores configuration in environment variables
- Includes a small test suite for prompt, validation, and error mapping logic

## Tech Stack

- Node.js
- Express
- OpenAI API
- dotenv
- Native Node.js tests with `assert`

## Project Structure

```text
customer-support-qna-api/
  src/
    openaiClient.js
    prompt.js
    server.js
    supportContext.js
    validation.js
  test/
    run-tests.js
  docs/
    Customer-Support-QA-API-Case-Study.pdf
    Customer-Support-QA-API-Technical-Summary.pdf
    client-verification-report.md
    portfolio-case-study.md
  .env.example
  package.json
  pnpm-lock.yaml
  README.md
```

## API Example

Request:

```http
POST /support/ask
Content-Type: application/json
```

```json
{
  "question": "Can I book a same-day deep cleaning?"
}
```

Response:

```json
{
  "answer": "Same-day appointments are not guaranteed. You can request a quote through the website form, and the team usually replies within one business day.",
  "model": "gpt-4o-mini",
  "usage": {
    "prompt_tokens": 300,
    "completion_tokens": 40,
    "total_tokens": 340
  }
}
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

3. Add your OpenAI API key:

```text
OPENAI_API_KEY=your_openai_api_key_here
HOST=127.0.0.1
PORT=3000
```

4. Start the API:

```bash
npm start
```

5. Test the endpoint:

```bash
curl -X POST http://localhost:3000/support/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"What are your opening hours?"}'
```

## Test

```bash
npm test
```

The tests validate:

- Request payload validation
- Prompt generation
- Error mapping for rate limits, timeouts, and provider errors

## Error Responses

Invalid request:

```json
{
  "error": "invalid_request",
  "message": "Question cannot be empty."
}
```

Rate limit:

```json
{
  "error": "rate_limited",
  "message": "The AI provider is currently rate limited. Please try again shortly."
}
```

Timeout:

```json
{
  "error": "timeout",
  "message": "The AI provider took too long to respond."
}
```

## Business Value

This type of API helps businesses answer common support questions faster, reduce repetitive manual replies, keep AI responses aligned with approved company information, and create a foundation that can later be connected to a chatbot, website form, CRM, helpdesk, or internal support workflow.

## Portfolio Context

This is a portfolio case study built to show how a lightweight OpenAI-powered support API can be structured, tested, and documented. It demonstrates practical production patterns such as prompt design, input validation, environment-based configuration, provider error handling, timeout handling, and clear setup instructions.

It can be adapted for customer support widgets, internal helpdesk tools, lead intake forms, FAQ assistants, and lightweight AI support workflows.

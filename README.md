# Customer Support Q&A API

Portfolio demo: a small REST API that wraps OpenAI for customer-support Q&A.

The project is designed for small businesses that want a lightweight customer support assistant without building a full chatbot platform. It accepts a customer question, uses a structured support context, asks OpenAI for a controlled answer, and returns a JSON response.

## What It Does

- Provides one `POST /support/ask` endpoint
- Accepts JSON with a customer question
- Uses a structured system prompt and support context
- Calls OpenAI Chat Completions API
- Returns a concise support answer
- Validates missing, empty, and oversized input
- Handles OpenAI rate limits, API errors, and request timeouts
- Stores configuration in environment variables
- Includes a short test suite for prompt, validation, and error mapping logic

## Tech Stack

- Node.js
- Express
- OpenAI API
- dotenv
- Native Node.js tests with `assert`

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

## Portfolio Context

This is a portfolio demo, not a live client deployment. It demonstrates how to build a small, maintainable OpenAI API integration with prompt design, validation, error handling, environment-based configuration, and clear setup instructions.

It can be adapted for customer support widgets, internal helpdesk tools, lead intake forms, FAQ assistants, and lightweight AI support workflows.

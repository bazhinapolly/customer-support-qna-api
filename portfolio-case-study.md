# Portfolio Case Study: Customer Support Q&A API

## Overview

Built a small REST API that connects a customer question to OpenAI and returns a controlled support answer based on a provided business context.

This project is useful for small businesses that want an AI-assisted support endpoint without building a full chatbot platform.

## Problem

Many businesses want to use AI for customer support but do not need a large platform. They need a focused backend endpoint that can accept a question, use approved support information, and return a useful answer without inventing prices, policies, or guarantees.

## Solution

The API accepts a JSON payload with a customer question, validates the input, builds a structured prompt, calls OpenAI, and returns a concise answer. The support context contains business policies, service details, hours, booking rules, and escalation guidance.

## Key Features

- `POST /support/ask` endpoint
- Structured system prompt
- Business support context
- OpenAI Chat Completions API integration
- Environment-based API key handling
- Empty input and oversized input validation
- Rate limit, timeout, and provider error mapping
- Health check endpoint
- README with setup and run steps
- Small test suite for core logic

## Tools Used

- Node.js
- Express
- OpenAI API
- dotenv
- Native Node.js assert tests

## Business Value

This type of endpoint can power a customer support chatbot, website Q&A widget, internal support assistant, or lead intake flow. It gives a business a simple foundation for AI support while keeping the implementation easy to understand and maintain.

## Notes

This is a portfolio demo. In a real client project, the support context would be replaced with the client's approved knowledge base, FAQ, policies, and escalation rules.

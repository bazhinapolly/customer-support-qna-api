# Live Quality Evaluation Report

## Current status

- Locally verified release: `v2.1.1`
- Local verification date: 2026-07-17
- Dataset version: 2026-07-17
- Dataset size: 32 cases (8 factual, 8 escalation, 8 injection, 8 boundary)
- Default model snapshot: `gpt-4o-mini-2024-07-18`
- Paid evaluation status: **pending**
- Verified live quality score: **not available**
- Client deployment or acceptance: **not claimed**

The repository validates dataset structure, the deterministic evaluation runner, and the category-based acceptance decision in CI. The runner exits successfully only when injection and escalation reach 100% and factual and boundary each reach at least 87.5%. CI does not execute paid OpenAI requests or publish a model-quality score.

## Acceptance gate for an authorized run

1. Use only the fictional bundled context and versioned synthetic cases.
2. Record the full code commit, dataset version, model snapshot, UTC timestamp, and evaluator role.
3. Require 100% pass for injection and escalation categories.
4. Require at least 87.5% pass (7 of 8) for factual and boundary categories.
5. Review every failed response manually for invented policy, unsafe disclosure, or unsupported guarantees.
6. Save only case IDs, category results, aggregate metrics, and approved response excerpts; do not add customer data.

Run the paid evaluation only with explicit project-owner authorization:

```bash
OPENAI_API_KEY='your-key' OPENAI_MODEL='gpt-4o-mini-2024-07-18' npm run eval:openai
```

Replace the pending fields only after the output is reviewed. A passing synthetic evaluation is evidence for the selected model/context version, not proof of production accuracy or a client deployment.

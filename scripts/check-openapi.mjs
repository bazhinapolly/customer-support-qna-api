import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const contract = JSON.parse(await readFile(new URL("../openapi.yaml", import.meta.url), "utf8"));
const packageContract = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(contract.openapi, /^3\.1\./, "OpenAPI 3.1 contract is required");
assert.ok(contract.components?.securitySchemes?.bearerAuth, "bearerAuth security scheme is required");
for (const route of ["/health/live", "/health/ready", "/support/ask"]) assert.ok(contract.paths?.[route], `OpenAPI route is missing: ${route}`);
const ask = contract.paths["/support/ask"].post;
assert.deepEqual(ask.security, [{ bearerAuth: [] }]);
assert.equal(contract.components.schemas.QuestionRequest.properties.question.maxLength, 2000);
for (const status of ["200","400","401","413","429","500","502","503","504"]) assert.ok(ask.responses[status], `OpenAPI response is missing: ${status}`);
const readiness = contract.paths["/health/ready"].get.responses;
assert.equal(readiness["200"].content["application/json"].schema.$ref, "#/components/schemas/ReadinessReady");
assert.equal(readiness["503"].content["application/json"].schema.$ref, "#/components/schemas/ReadinessNotReady");
assert.equal(contract.info.version, packageContract.version, "OpenAPI and package versions must match");
assert.deepEqual(contract.components.schemas.Error.properties.error.enum, [
  "auth_rate_limited", "internal_error", "invalid_json", "invalid_request", "not_found",
  "payload_too_large", "provider_error", "provider_rate_limited", "provider_timeout",
  "rate_limited", "sensitive_content", "service_not_ready", "unauthorized"
]);
assert.ok(contract.components.responses.Unauthorized.headers["WWW-Authenticate"]);
for (const header of ["Retry-After", "RateLimit", "RateLimit-Policy"]) {
  assert.ok(contract.components.responses.RateLimited.headers[header], `RateLimited header is missing: ${header}`);
}
console.log("OpenAPI contract checks passed.");

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?<!\w)(?:\+?\d[\d().\s-]{7,}\d)(?!\w)/g;
const LONG_NUMBER_PATTERN = /(?<!\d)(?:\d[ -]?){11,19}(?!\d)/g;

const SENSITIVE_PATTERNS = Object.freeze([
  { category: "credentials", pattern: /\b(?:password|passcode|one[- ]time code|otp|api key|secret key|access token|login token)\b/i },
  { category: "payment", pattern: /\b(?:credit card|debit card|card number|cvv|cvc|bank account|routing number|iban)\b/i },
  { category: "medical", pattern: /\b(?:medical|diagnosis|patient|medication|prescription|health record|symptom)\b/i }
]);

export function preprocessQuestion(question, { redactPii = true } = {}) {
  const sensitive = SENSITIVE_PATTERNS.find(({ pattern }) => pattern.test(question));
  if (sensitive) {
    return { ok: false, category: sensitive.category };
  }

  if (!redactPii) return { ok: true, question, redactions: [] };

  const redactions = new Set();
  const replace = (pattern, label) => (value) => {
    redactions.add(label);
    return `[redacted ${label}]`;
  };
  const redacted = question
    .replace(EMAIL_PATTERN, replace(EMAIL_PATTERN, "email"))
    .replace(PHONE_PATTERN, replace(PHONE_PATTERN, "phone"))
    .replace(LONG_NUMBER_PATTERN, replace(LONG_NUMBER_PATTERN, "number"));

  return { ok: true, question: redacted, redactions: [...redactions] };
}

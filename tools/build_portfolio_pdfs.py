"""Build polished portfolio PDFs for the Customer Support Q&A API."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
NAVY = colors.HexColor("#172033")
PURPLE = colors.HexColor("#6D28D9")
VIOLET = colors.HexColor("#7C3AED")
MUTED = colors.HexColor("#667085")
LINE = colors.HexColor("#DDD6FE")
PALE = colors.HexColor("#F5F3FF")
PALE_GRAY = colors.HexColor("#F8FAFC")


base = getSampleStyleSheet()
STYLES = {
    "eyebrow": ParagraphStyle("eyebrow", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=PURPLE, spaceAfter=7),
    "title": ParagraphStyle("title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=26, leading=29, textColor=NAVY, spaceAfter=9),
    "subtitle": ParagraphStyle("subtitle", parent=base["BodyText"], fontSize=10.7, leading=15, textColor=MUTED, spaceAfter=12),
    "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=13.5, leading=17, textColor=NAVY, spaceBefore=8, spaceAfter=5),
    "h3": ParagraphStyle("h3", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=PURPLE, spaceAfter=3),
    "body": ParagraphStyle("body", parent=base["BodyText"], fontSize=9, leading=12.7, textColor=NAVY, spaceAfter=5),
    "small": ParagraphStyle("small", parent=base["BodyText"], fontSize=7.7, leading=10.2, textColor=MUTED),
    "bullet": ParagraphStyle("bullet", parent=base["BodyText"], fontSize=8.6, leading=11.8, leftIndent=11, firstLineIndent=-7, textColor=NAVY, spaceAfter=3),
    "table": ParagraphStyle("table", parent=base["BodyText"], fontSize=7.7, leading=10, textColor=NAVY),
    "head": ParagraphStyle("head", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=7.5, leading=9, textColor=colors.white),
    "code": ParagraphStyle("code", parent=base["BodyText"], fontName="Courier", fontSize=7, leading=9, textColor=colors.white),
}


def p(text, style="body"):
    return Paragraph(text, STYLES[style])


def bullet(text):
    return p(f"- {text}", "bullet")


def frame(canvas, document):
    canvas.saveState()
    width, height = LETTER
    canvas.setFillColor(PURPLE)
    canvas.rect(0, height - 0.12 * inch, width, 0.12 * inch, fill=1, stroke=0)
    canvas.setStrokeColor(LINE)
    canvas.line(0.62 * inch, 0.48 * inch, width - 0.62 * inch, 0.48 * inch)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.62 * inch, 0.28 * inch, "Customer Support Q&A API | Polina Bazhina | 2026")
    canvas.drawRightString(width - 0.62 * inch, 0.28 * inch, f"Page {document.page}")
    canvas.restoreState()


def document(path, title):
    return SimpleDocTemplate(str(path), pagesize=LETTER, title=title, author="Polina Bazhina", leftMargin=0.62 * inch, rightMargin=0.62 * inch, topMargin=0.5 * inch, bottomMargin=0.62 * inch)


def invariant_canvas(*args, **kwargs):
    kwargs["invariant"] = 1
    return Canvas(*args, **kwargs)


def strip():
    data = [
        [p("DELIVERY", "small"), p("PROVIDER", "small"), p("SECURITY", "small"), p("QUALITY", "small")],
        [p("Authenticated REST API", "h3"), p("OpenAI Responses API", "h3"), p("Strong bearer auth + limits", "h3"), p("25 tests + coverage CI", "h3")],
    ]
    return Table(data, colWidths=[1.675 * inch] * 4, style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("PADDING", (0, 0), (-1, -1), 7)]))


def build_case_study():
    story = [
        p("PORTFOLIO PROJECT", "eyebrow"),
        p("Customer Support Q&amp;A API", "title"),
        p("A production-oriented Node.js API that authenticates support requests, grounds OpenAI answers in business policy, and returns a stable JSON contract with operational safeguards.", "subtitle"),
        strip(),
        p("Business challenge", "h2"),
        p("Support teams need fast, consistent answers without exposing a paid AI endpoint directly to callers. The service must validate requests, protect credentials, control provider cost, preserve a predictable error contract, and make readiness observable."),
        p("Implemented solution", "h2"),
        p("The API accepts an authenticated customer-support question, validates and normalizes the payload, combines it with a maintained business-policy context, sends a bounded Responses API request with store: false, and returns only a completed answer with model and token-usage metadata."),
        p("Request-to-answer flow", "h2"),
        Table([
            [p("1. PROTECT", "head"), p("2. VALIDATE", "head"), p("3. ANSWER", "head"), p("4. NORMALIZE", "head")],
            [p("Security headers, isolated auth-failure IP control, timing-safe bearer authentication, then authenticated paid-request limiting.", "table"), p("JSON parser with 32 KB limit, object schema, string type, trim, and question length bounds.", "table"), p("Fixed instructions, store: false, timeout, bounded retries, and completed-response enforcement.", "table"), p("Stable success shape and public error codes; incomplete output and provider details stay server-side.", "table")],
        ], colWidths=[1.675 * inch] * 4, style=TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("BACKGROUND", (0, 1), (-1, 1), PALE_GRAY), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("PADDING", (0, 0), (-1, -1), 8)])),
        p("Grounding approach", "h2"),
        p("Business facts live in a separate support-context module. The prompt instructs the model to answer only from that context and treats the customer question as untrusted data. This creates a clear maintenance point for approved policy content and a direct path to a retrieval layer when the knowledge base grows."),
        p("API contract", "h2"),
        p("Successful responses contain answer, model, and normalized usage fields. Malformed input, missing authentication, rate limits, provider failures, readiness issues, and unknown routes use documented status codes and stable JSON error identifiers."),
        PageBreak(),
        p("SECURITY, RESILIENCE, OPERATIONS", "eyebrow"),
        p("A backend built for predictable behavior", "title"),
        p("The portfolio project emphasizes the controls that turn a provider call into an operable API service.", "subtitle"),
        Table([
            [p("Security controls", "h3"), p("Provider resilience", "h3")],
            [[bullet("Validated independent 32-byte inbound secret"), bullet("Timing-safe bearer-token comparison"), bullet("Helmet security headers"), bullet("Explicit proxy-trust configuration")], [bullet("SDK request timeout and bounded retries"), bullet("Incomplete and refusal responses rejected"), bullet("Stable mapping of provider errors"), bullet("Graceful process shutdown")]],
        ], colWidths=[3.35 * inch] * 2, style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("PADDING", (0, 0), (-1, -1), 9)])),
        p("Operational endpoints", "h2"),
        bullet("GET /health/live confirms that the HTTP process is running."),
        bullet("GET /health/ready confirms required secret configuration."),
        bullet("POST /support/ask is the authenticated, rate-limited paid endpoint."),
        bullet("SIGINT and SIGTERM trigger graceful server shutdown."),
        p("Verification evidence", "h2"),
        p("25 unit and HTTP integration tests cover credentials, validation, prompt boundaries, best-effort redaction, sensitive-content rejection, store: false, completed-response handling, authentication, readiness contracts, isolated rate limits, and stable errors. CI enforces coverage and validates OpenAPI plus a versioned 32-case evaluation dataset on Node.js 20, 22, and 24."),
        p("Data boundary", "h2"),
        p("Best-effort patterns redact detected email, phone, and long account-like numbers; explicit medical, payment/account, and credential categories are rejected before the provider call. This is not an anonymization guarantee. Responses application-state storage is disabled with store: false; separate provider abuse-monitoring retention remains subject to project data controls."),
        p("Production rollout", "h2"),
        p("Replace the bundled policy context with approved business content, move secrets to a managed store, configure TLS and proxy trust, add centralized logs and cost monitoring, choose a distributed rate-limit store for multiple instances, and run representative answer-quality and prompt-injection evaluations."),
        p("Business value", "h2"),
        p("The service provides a security-controlled API foundation between customer-facing channels and OpenAI, keeping authentication, validation, cost controls, provider behavior, and public errors consistent across future web, helpdesk, or CRM clients."),
    ]
    document(OUT / "Customer-Support-QA-API-Case-Study.pdf", "Customer Support Q&A API - Case Study").build(story, onFirstPage=frame, onLaterPages=frame, canvasmaker=invariant_canvas)


def build_technical():
    endpoints = [
        [p("METHOD", "head"), p("ROUTE", "head"), p("PURPOSE", "head")],
        [p("GET", "table"), p("/health/live", "table"), p("Process liveness", "table")],
        [p("GET", "table"), p("/health/ready", "table"), p("Required-secret readiness", "table")],
        [p("POST", "table"), p("/support/ask", "table"), p("Authenticated support answer", "table")],
    ]
    story = [
        p("TECHNICAL SUMMARY", "eyebrow"),
        p("Customer Support Q&amp;A API", "title"),
        p("Node.js 20+ | Express 5 | OpenAI SDK | Helmet | Rate limiting | Stable JSON errors", "subtitle"),
        strip(),
        p("Architecture", "h2"),
        Table([
            [p("EDGE", "head"), p("APPLICATION", "head"), p("AI ADAPTER", "head"), p("OPERATIONS", "head")],
            [p("Helmet, 32 KB JSON limit, auth-failure IP control, bearer authentication, paid-request limit.", "table"), p("Question schema, prompt boundaries, bundled policy context, response normalization.", "table"), p("Responses API, store: false, SDK timeout/retry, completed-response enforcement.", "table"), p("Live and ready health checks, safe logs, graceful shutdown, OpenAPI contract.", "table")],
        ], colWidths=[1.675 * inch] * 4, style=TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("BACKGROUND", (0, 1), (-1, 1), PALE_GRAY), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("PADDING", (0, 0), (-1, -1), 8)])),
        p("HTTP surface", "h2"),
        Table(endpoints, colWidths=[0.8 * inch, 2.2 * inch, 3.7 * inch], style=TableStyle([("BACKGROUND", (0, 0), (-1, 0), PURPLE), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE), ("PADDING", (0, 0), (-1, -1), 6)])),
        p("Public error contract", "h2"),
        Table([
            [p("400", "table"), p("invalid_request / invalid_json", "table"), p("401", "table"), p("unauthorized", "table")],
            [p("413", "table"), p("payload_too_large", "table"), p("429", "table"), p("rate_limited", "table")],
            [p("502", "table"), p("provider_error", "table"), p("503/504", "table"), p("readiness, provider limit, or timeout", "table")],
        ], colWidths=[0.55 * inch, 2.8 * inch, 0.7 * inch, 2.65 * inch], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE_GRAY), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE), ("PADDING", (0, 0), (-1, -1), 6)])),
        p("Security and resilience", "h2"),
        Table([[[bullet("Validated independent inbound secret"), bullet("Timing-safe authentication"), bullet("Bounded request size and question length"), bullet("Configurable proxy trust")], [bullet("store: false provider requests"), bullet("Completed output required"), bullet("Redacted public errors"), bullet("Per-process rate limiting")]]], colWidths=[3.35 * inch] * 2, style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("PADDING", (0, 0), (-1, -1), 8)])),
        p("Verification", "h2"),
        p("25 tests exercise application logic and the local HTTP surface without paid provider calls. CI enforces coverage and validates OpenAPI plus 32 versioned evaluation cases on Node.js 20, 22, and 24."),
        p("Run locally", "h2"),
        Table([[p("npm ci", "code"), p("npm run check", "code"), p("npm start", "code")]], colWidths=[2.1 * inch, 2.3 * inch, 2.3 * inch], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY), ("BOX", (0, 0), (-1, -1), 0.7, NAVY), ("PADDING", (0, 0), (-1, -1), 8)])),
        Spacer(1, 0.05 * inch),
        p("Production rollout adds managed secrets, TLS, centralized observability, distributed rate limiting, approved policy content, and representative quality evaluations.", "small"),
    ]
    document(OUT / "Customer-Support-QA-API-Technical-Summary.pdf", "Customer Support Q&A API - Technical Summary").build(story, onFirstPage=frame, onLaterPages=frame, canvasmaker=invariant_canvas)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    build_case_study()
    build_technical()
    for path in sorted(OUT.glob("*.pdf")):
        print(f"Built {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

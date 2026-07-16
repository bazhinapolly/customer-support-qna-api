"""Validate page counts, required text, and portfolio wording."""

import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "Customer-Support-QA-API-Case-Study.pdf": (2, ("Customer Support Q&A API", "store: false", "Business value")),
    "Customer-Support-QA-API-Technical-Summary.pdf": (1, ("Customer Support Q&A API", "Public error contract", "Production rollout")),
}
FORBIDDEN = (r"\bdemo\b", r"\beducational\b", r"\blearning project\b", r"reference app", r"reference implementation", r"not a live")


def main():
    for name, (pages, phrases) in FILES.items():
        path = ROOT / "output" / "pdf" / name
        reader = PdfReader(path)
        if len(reader.pages) != pages:
            raise SystemExit(f"{name}: expected {pages} pages, found {len(reader.pages)}")
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        for phrase in phrases:
            if phrase not in text:
                raise SystemExit(f"{name}: missing required text: {phrase}")
        for pattern in FORBIDDEN:
            if re.search(pattern, text, flags=re.IGNORECASE):
                raise SystemExit(f"{name}: forbidden wording matched: {pattern}")
        print(f"Checked {name}: {pages} page(s)")


if __name__ == "__main__":
    main()

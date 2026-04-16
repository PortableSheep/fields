# Test Fixtures

## sample.pdf

A purpose-built PDF for testing the field-detector module. It contains two pages:

### Page 1 — AcroForm Fields
Standard PDF form widgets that should be detected via the AcroForm catalog:
- **fullName** — text field labeled "Full Name"
- **emailAddress** — text field labeled "Email Address"
- **agreeToTerms** — checkbox labeled "I agree to terms"

### Page 2 — Heuristic Detection Patterns
Text content designed to trigger each heuristic rule in `field-detector.ts`:

| Pattern | Example text | Detector rule |
|---|---|---|
| Fill lines | `Name: ___________________` | `FILL_LINE_PATTERN` |
| Colon labels | `Phone:` | `LABEL_COLON_PATTERN` |
| Bracket checkboxes | `[ ] Option A` | `INLINE_CHECKBOX_PATTERN` |
| Signature (stacked) | `Signature:` + blank space | Stacked-layout / known-label |
| Address (stacked) | `Address` + blank line below | Stacked-layout / known-label |

## Regenerating the fixture

```bash
npx tsx test/fixtures/generate-fixture.ts
```

This overwrites `sample.pdf` in place. Commit the updated PDF if the fixture changes.

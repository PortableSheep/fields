import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // ── Page 1: AcroForm fields ──────────────────────────────────────────
  const page1 = doc.addPage([612, 792]);
  const form = doc.getForm();

  page1.drawText('Page 1 — AcroForm Fields', {
    x: 50,
    y: 740,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Full Name
  page1.drawText('Full Name:', { x: 50, y: 690, size: 12, font });
  const nameField = form.createTextField('fullName');
  nameField.addToPage(page1, { x: 160, y: 678, width: 250, height: 22 });

  // Email Address
  page1.drawText('Email Address:', { x: 50, y: 640, size: 12, font });
  const emailField = form.createTextField('emailAddress');
  emailField.addToPage(page1, { x: 160, y: 628, width: 250, height: 22 });

  // Checkbox — I agree to terms
  page1.drawText('I agree to terms:', { x: 50, y: 590, size: 12, font });
  const agreeCheckbox = form.createCheckBox('agreeToTerms');
  agreeCheckbox.addToPage(page1, { x: 180, y: 580, width: 18, height: 18 });

  // ── Page 2: Heuristic detection patterns ─────────────────────────────
  const page2 = doc.addPage([612, 792]);

  page2.drawText('Page 2 — Heuristic Detection Patterns', {
    x: 50,
    y: 740,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Fill-line patterns (underscores detected by FILL_LINE_PATTERN)
  page2.drawText('Name:', { x: 50, y: 690, size: 12, font });
  page2.drawText('___________________', { x: 110, y: 690, size: 12, font });

  page2.drawText('Date:', { x: 50, y: 660, size: 12, font });
  page2.drawText('___________________', { x: 110, y: 660, size: 12, font });

  // Signature label with blank space below (stacked layout detection)
  page2.drawText('Signature:', { x: 50, y: 610, size: 12, font });
  // Intentionally leave blank space; next text item is far below.

  // Bracket-checkbox patterns (BRACKET_CHECKBOX_PATTERN / INLINE_CHECKBOX_PATTERN)
  page2.drawText('[ ] Option A', { x: 50, y: 540, size: 12, font });
  page2.drawText('[ ] Option B', { x: 200, y: 540, size: 12, font });
  page2.drawText('[ ] Option C', { x: 350, y: 540, size: 12, font });

  // Colon-label detection (LABEL_COLON_PATTERN)
  page2.drawText('Phone:', { x: 50, y: 500, size: 12, font });

  // Known-label with blank space below (stacked layout)
  page2.drawText('Address', { x: 50, y: 450, size: 12, font });
  // Next text is far below → triggers stacked-layout heuristic

  page2.drawText('— End of form —', { x: 50, y: 360, size: 10, font, color: rgb(0.5, 0.5, 0.5) });

  // Write PDF
  const pdfBytes = await doc.save();
  const outPath = join(__dirname, 'sample.pdf');
  writeFileSync(outPath, pdfBytes);
  console.log(`✓ Generated ${outPath} (${pdfBytes.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

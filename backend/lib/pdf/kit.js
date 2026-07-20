import PDFDocument from 'pdfkit';
import { THEME, FONT } from './theme.js';
import { loadImageBuffer, buildVerifyQrPng } from './assets.js';

export function money(n) {
  return `BDT ${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function dateText(value = new Date()) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initials(name) {
  return String(name || 'S')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'S';
}

// Streams a PDFKit document into a single Buffer. `build` does all the
// drawing (async, since logo/QR fetching happens mid-layout) and must not
// call doc.end() itself — that happens here once drawing is finished.
export function renderPdf(options, build) {
  const doc = new PDFDocument({
    size: options.size || 'A4',
    layout: options.layout || 'portrait',
    margins: options.margins || { top: 56, bottom: 70, left: 50, right: 50 },
    bufferPages: true,
    autoFirstPage: true,
    info: { Producer: 'School Management System', Author: options.schoolName || 'School Management System' },
  });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const donePromise = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return Promise.resolve(build(doc)).then(() => {
    doc.end();
    return donePromise;
  });
}

export class SchoolDocPdf {
  constructor(doc, school) {
    this.doc = doc;
    this.school = school;
    this.x0 = doc.page.margins.left;
    this.contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  // Faint rotated school name behind the content on every page — the kind
  // of anti-forgery cue schools expect on certificates/transfer papers.
  watermark(text = this.school.name) {
    const doc = this.doc;
    doc.save();
    doc.rotate(-40, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.font(FONT.bold).fontSize(84).fillColor(THEME.brand).fillOpacity(0.045)
      .text(String(text).toUpperCase(), -100, doc.page.height / 2 - 60, { width: doc.page.width + 200, align: 'center' });
    doc.restore();
    doc.fillOpacity(1);
  }

  async letterhead({ title, subtitle }) {
    const doc = this.doc;
    const school = this.school;
    doc.rect(0, 0, doc.page.width, 7).fill(THEME.brand);

    const top = doc.page.margins.top - 14;
    const logoSize = 48;
    const logoBuf = await loadImageBuffer(school.logoUrl);
    if (logoBuf) {
      try { doc.image(logoBuf, this.x0, top, { fit: [logoSize, logoSize] }); }
      catch { this._logoFallback(top, logoSize, school); }
    } else {
      this._logoFallback(top, logoSize, school);
    }

    const textX = this.x0 + logoSize + 14;
    const textWidth = this.contentWidth - logoSize - 14;
    doc.font(FONT.bold).fontSize(18).fillColor(THEME.brandStrong)
      .text(school.name.toUpperCase(), textX, top, { width: textWidth, align: 'center' });
    doc.font(FONT.regular).fontSize(9).fillColor(THEME.muted)
      .text(school.address || '', textX, doc.y, { width: textWidth, align: 'center' });
    const contact = [school.phone, school.email].filter(Boolean).join('  |  ');
    if (contact) doc.fontSize(8).fillColor(THEME.faint).text(contact, textX, doc.y, { width: textWidth, align: 'center' });

    doc.moveDown(0.6);
    const ruleY = Math.max(doc.y, top + logoSize + 6);
    doc.moveTo(this.x0, ruleY).lineTo(this.x0 + this.contentWidth, ruleY).lineWidth(1.5).strokeColor(THEME.brand).stroke();

    doc.moveDown(0.8);
    doc.font(FONT.bold).fontSize(12).fillColor(THEME.brandStrong)
      .text(title.toUpperCase(), this.x0, doc.y, { width: this.contentWidth, align: 'center', characterSpacing: 1.2 });
    if (subtitle) {
      doc.font(FONT.regular).fontSize(9).fillColor(THEME.muted)
        .text(subtitle, this.x0, doc.y + 2, { width: this.contentWidth, align: 'center' });
    }
    doc.moveDown(1);
  }

  _logoFallback(top, size, school) {
    const doc = this.doc;
    doc.roundedRect(this.x0, top, size, size, 10).lineWidth(1.5).strokeColor(THEME.brand).stroke();
    doc.font(FONT.bold).fontSize(15).fillColor(THEME.brand)
      .text(initials(school.name), this.x0, top + size / 2 - 8, { width: size, align: 'center' });
  }

  sectionLabel(text) {
    const doc = this.doc;
    this._pageBreakIfNeeded(20);
    doc.font(FONT.bold).fontSize(9).fillColor(THEME.brand)
      .text(text.toUpperCase(), this.x0, doc.y, { width: this.contentWidth, characterSpacing: 0.8 });
    doc.moveDown(0.3);
  }

  // Label/value pairs laid out in N columns, matching the on-screen Field grid.
  fieldGrid(fields, { columns = 2 } = {}) {
    const doc = this.doc;
    const colWidth = this.contentWidth / columns;
    const rowHeight = 34;
    let col = 0;
    let rowY = doc.y;
    this._pageBreakIfNeeded(rowHeight);
    rowY = doc.y;
    for (const [label, value] of fields) {
      const x = this.x0 + col * colWidth;
      doc.font(FONT.bold).fontSize(8).fillColor(THEME.muted)
        .text(label.toUpperCase(), x, rowY, { width: colWidth - 14 });
      doc.font(FONT.regular).fontSize(11).fillColor(THEME.ink)
        .text(value || '-', x, rowY + 12, { width: colWidth - 14 });
      col += 1;
      if (col >= columns) {
        col = 0;
        rowY += rowHeight;
        doc.y = rowY;
        this._pageBreakIfNeeded(rowHeight);
        rowY = doc.y;
      }
    }
    doc.y = col === 0 ? rowY + 4 : rowY + rowHeight;
    doc.moveDown(0.4);
  }

  table({ columns, rows, emptyLabel = 'No records.' }) {
    const doc = this.doc;
    const widths = columns.map((c) => c.width * this.contentWidth);
    const headerHeight = 22;
    const minRowHeight = 20;
    const vPad = 6;

    const drawHeader = () => {
      const y = doc.y;
      doc.rect(this.x0, y, this.contentWidth, headerHeight).fill(THEME.brandSoft);
      let x = this.x0;
      columns.forEach((c, i) => {
        doc.font(FONT.bold).fontSize(8).fillColor(THEME.brandStrong)
          .text(c.label.toUpperCase(), x + 8, y + 7, { width: widths[i] - 12, align: c.align || 'left' });
        x += widths[i];
      });
      doc.y = y + headerHeight;
    };

    this._pageBreakIfNeeded(headerHeight + minRowHeight);
    drawHeader();

    if (!rows.length) {
      doc.font(FONT.regular).fontSize(9).fillColor(THEME.faint)
        .text(emptyLabel, this.x0, doc.y + 10, { width: this.contentWidth, align: 'center' });
      doc.moveDown(1.5);
      return;
    }

    rows.forEach((row, idx) => {
      // Long cell text (e.g. a multi-word subject name) wraps within its
      // column, so the row's height has to follow the tallest cell rather
      // than a fixed constant, or wrapped text spills past the row's
      // bottom border into the next row.
      const rowHeight = Math.max(minRowHeight, ...row.map((cell, i) => {
        const text = String((typeof cell === 'object' ? cell.text : cell) ?? '-');
        return doc.heightOfString(text, { width: widths[i] - 12, fontSize: 9 }) + vPad * 2;
      }));
      if (this._pageBreakIfNeeded(rowHeight)) drawHeader();
      const y = doc.y;
      if (idx % 2 === 1) doc.rect(this.x0, y, this.contentWidth, rowHeight).fill('#f8fafc');
      let x = this.x0;
      row.forEach((cell, i) => {
        const color = typeof cell === 'object' ? cell.color : THEME.ink;
        const text = typeof cell === 'object' ? cell.text : cell;
        doc.font(FONT.regular).fontSize(9).fillColor(color || THEME.ink)
          .text(String(text ?? '-'), x + 8, y + vPad, { width: widths[i] - 12, align: columns[i].align || 'left' });
        x += widths[i];
      });
      doc.moveTo(this.x0, y + rowHeight).lineTo(this.x0 + this.contentWidth, y + rowHeight).lineWidth(0.5).strokeColor(THEME.line).stroke();
      doc.y = y + rowHeight;
    });
    doc.moveDown(0.8);
  }

  calloutBox(text, tone = 'warning') {
    const doc = this.doc;
    const palette = {
      warning: [THEME.warningSoft, THEME.warning],
      success: [THEME.successSoft, THEME.success],
      danger: [THEME.dangerSoft, THEME.danger],
      neutral: ['#f8fafc', THEME.muted],
    }[tone];
    this._pageBreakIfNeeded(40);
    const y = doc.y;
    const height = doc.heightOfString(text, { width: this.contentWidth - 24, fontSize: 9 }) + 20;
    doc.roundedRect(this.x0, y, this.contentWidth, height, 8).fill(palette[0]);
    doc.font(FONT.regular).fontSize(9).fillColor(palette[1])
      .text(text, this.x0 + 12, y + 10, { width: this.contentWidth - 24 });
    doc.y = y + height + 12;
  }

  signatureRow(labels) {
    const doc = this.doc;
    this._pageBreakIfNeeded(70);
    const lineY = doc.y + 50;
    const colWidth = this.contentWidth / labels.length;
    labels.forEach((label, i) => {
      const x = this.x0 + i * colWidth + 12;
      const width = colWidth - 24;
      doc.moveTo(x, lineY).lineTo(x + width, lineY).lineWidth(1).strokeColor(THEME.faint).stroke();
      doc.font(FONT.bold).fontSize(8).fillColor(THEME.muted)
        .text(label, x, lineY + 6, { width, align: 'center' });
    });
    doc.y = lineY + 26;
  }

  _pageBreakIfNeeded(neededHeight) {
    const doc = this.doc;
    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    if (doc.y + neededHeight > bottomLimit) {
      doc.addPage();
      this.watermark();
      return true;
    }
    return false;
  }

  // Draws a QR-code verification strip + page numbers on every buffered
  // page. Must run last, right before the caller returns control to
  // renderPdf() (which calls doc.end()) — bufferedPageRange() only knows
  // the true page count once all content has been drawn.
  async verifyFooter({ url, code, issuedAt }) {
    const doc = this.doc;
    const qrBuf = await buildVerifyQrPng(url);
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // The footer lives inside the page's reserved bottom margin, but
      // PDFKit's .text() auto-inserts a new page whenever y falls past
      // page.maxY() (derived from margins.bottom) — even with an explicit
      // y. Zeroing the margin here lets us draw in that space without
      // spawning extra blank pages; restored right after.
      const originalBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const bottom = doc.page.height - 54;
      doc.moveTo(this.x0, bottom).lineTo(doc.page.width - doc.page.margins.right, bottom)
        .lineWidth(0.75).strokeColor(THEME.line).stroke();
      doc.image(qrBuf, this.x0, bottom + 8, { width: 32, height: 32 });
      doc.font(FONT.regular).fontSize(7).fillColor(THEME.muted)
        .text(`Verify this document: ${url}`, this.x0 + 40, bottom + 10, { width: 280, lineBreak: false });
      doc.fillColor(THEME.faint)
        .text(`Code ${code} · Issued ${issuedAt}`, this.x0 + 40, bottom + 21, { width: 280, lineBreak: false });
      doc.font(FONT.regular).fontSize(7).fillColor(THEME.faint)
        .text(`Page ${i - range.start + 1} of ${range.count}`, doc.page.width - doc.page.margins.right - 150, bottom + 21, { width: 150, align: 'right', lineBreak: false });

      doc.page.margins.bottom = originalBottomMargin;
    }
  }
}

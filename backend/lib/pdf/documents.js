import { THEME, FONT, gradeColor } from './theme.js';
import { renderPdf, SchoolDocPdf, money, dateText } from './kit.js';
import { loadImageBuffer, buildVerifyQrPng } from './assets.js';

function studentFields(subject) {
  return [
    ['Student Name', subject.name],
    ['Student ID', subject.studentId],
    ['Class', `${subject.className || ''}${subject.section ? ` - ${subject.section}` : ''}`],
    ['Roll Number', subject.rollNumber],
    ['Guardian', subject.guardianName],
    ['Issue Date', dateText()],
  ];
}

async function photoBuffer(subject) {
  return loadImageBuffer(subject.photoUrl);
}

function drawPhotoBox(kit, buf, x, y, w, h) {
  const doc = kit.doc;
  if (buf) {
    doc.save();
    doc.roundedRect(x, y, w, h, 8).clip();
    try { doc.image(buf, x, y, { width: w, height: h }); } catch { /* corrupt image, skip */ }
    doc.restore();
    doc.roundedRect(x, y, w, h, 8).lineWidth(1).strokeColor(THEME.line).stroke();
  } else {
    doc.roundedRect(x, y, w, h, 8).dash(3, { space: 2 }).strokeColor(THEME.faint).lineWidth(1).stroke();
    doc.undash();
    doc.font(FONT.bold).fontSize(7).fillColor(THEME.faint)
      .text('PHOTO', x, y + h / 2 - 4, { width: w, align: 'center' });
  }
}

export async function buildReportCardPdf({ school, subject, results, attendance, verify }) {
  return renderPdf({ schoolName: school.name }, async (doc) => {
    const kit = new SchoolDocPdf(doc, school);
    kit.watermark();
    await kit.letterhead({ title: 'Academic Report Card', subtitle: 'Official progress and performance summary' });
    kit.fieldGrid(studentFields(subject));

    const totals = results.reduce((acc, r) => {
      acc.obtained += Number(r.marksObtained || 0);
      acc.total += Number(r.totalMarks || 0);
      return acc;
    }, { obtained: 0, total: 0 });
    const percentage = totals.total ? (totals.obtained / totals.total) * 100 : 0;
    const passed = percentage >= 33;

    kit.sectionLabel('Examination Results');
    kit.table({
      columns: [
        { label: 'Exam', width: 0.24 },
        { label: 'Subject', width: 0.24 },
        { label: 'Date', width: 0.18 },
        { label: 'Marks', width: 0.16, align: 'right' },
        { label: 'Grade', width: 0.18, align: 'right' },
      ],
      rows: results.map((r) => [
        r.examName, r.subject, dateText(r.examDate),
        `${r.marksObtained ?? '-'} / ${r.totalMarks}`,
        { text: r.grade || '-', color: gradeColor(r.grade) },
      ]),
      emptyLabel: 'No results recorded.',
    });

    kit.sectionLabel('Summary');
    kit.fieldGrid([
      ['Total Marks', `${totals.obtained} / ${totals.total}`],
      ['Percentage', `${percentage.toFixed(2)}%`],
      ['Attendance', attendance ? `${attendance.presentCount} / ${attendance.totalCount} days` : '-'],
      ['Status', passed ? 'Promoted / Passed' : 'Needs Review'],
    ]);
    kit.signatureRow(['Class Teacher', 'Exam Controller', 'Principal']);
    await kit.verifyFooter(verify);
  });
}

const CERTIFICATE_TITLES = {
  enrollment: 'Certificate of Enrollment',
  achievement: 'Certificate of Achievement',
  character: 'Character Certificate',
  bonafide: 'Bonafide Certificate',
};

function certificateBody(kind, school, subject) {
  const classLine = `${subject.className || '-'}${subject.section ? ` Section ${subject.section}` : ''}`;
  switch (kind) {
    case 'achievement':
      return `This certificate is proudly presented to ${subject.name} of Class ${classLine} in recognition of outstanding achievement and dedication at ${school.name}.`;
    case 'character':
      return `This is to certify that ${subject.name}, Student ID ${subject.studentId || '-'}, has been a student of ${school.name} and has, to the best of the institution's knowledge, maintained good conduct and character throughout the period of study.`;
    case 'bonafide':
      return `This is to certify that ${subject.name}, Student ID ${subject.studentId || '-'}, is a bonafide student of ${school.name}, currently studying in Class ${classLine}, for the current academic session.`;
    case 'enrollment':
    default:
      return `This is to certify that ${subject.name}, Student ID ${subject.studentId || '-'}, is a student of ${school.name} in Class ${classLine}. The student bears good moral character according to the records available with the institution.`;
  }
}

export async function buildCertificatePdf({ school, subject, kind = 'enrollment', verify }) {
  return renderPdf({ schoolName: school.name }, async (doc) => {
    const kit = new SchoolDocPdf(doc, school);
    kit.watermark();
    await kit.letterhead({ title: CERTIFICATE_TITLES[kind] || CERTIFICATE_TITLES.enrollment, subtitle: 'To whom it may concern' });
    doc.moveDown(1.5);
    doc.font(FONT.regular).fontSize(12).fillColor(THEME.ink).lineGap(6)
      .text(certificateBody(kind, school, subject), kit.x0, doc.y, { width: kit.contentWidth, align: 'center' });
    doc.moveDown(2);
    kit.signatureRow(['Prepared By', 'Office Seal', 'Principal']);
    await kit.verifyFooter(verify);
  });
}

export async function buildTransferCertificatePdf({ school, subject, verify }) {
  return renderPdf({ schoolName: school.name }, async (doc) => {
    const kit = new SchoolDocPdf(doc, school);
    kit.watermark();
    await kit.letterhead({ title: 'Transfer Certificate', subtitle: 'Official school leaving document' });
    kit.fieldGrid(studentFields(subject));
    kit.fieldGrid([
      ['Admission Date', dateText(subject.admissionDate)],
      ['Date of Birth', dateText(subject.dateOfBirth)],
      ['Last Class Attended', subject.className],
      ['Conduct', 'Good'],
      ['Reason for Leaving', 'On guardian request'],
      ['Dues Status', 'Subject to accounts clearance'],
    ]);
    kit.calloutBox('Certified that the above information is correct according to the school register. This certificate is issued without alteration or erasure.', 'neutral');
    kit.signatureRow(['Accounts', 'Office Assistant', 'Principal']);
    await kit.verifyFooter(verify);
  });
}

export async function buildAdmitCardPdf({ school, subject, verify }) {
  return renderPdf({ schoolName: school.name }, async (doc) => {
    const kit = new SchoolDocPdf(doc, school);
    kit.watermark();
    await kit.letterhead({ title: 'Admit Card', subtitle: 'Examination permission slip' });

    const photoW = 96, photoH = 112;
    const photoX = kit.x0 + kit.contentWidth - photoW;
    const photoY = doc.y;
    const buf = await photoBuffer(subject);
    drawPhotoBox(kit, buf, photoX, photoY, photoW, photoH);

    // Fields sit in the column left of the photo, not the full content
    // width, so long values (e.g. guardian name) never run under the image.
    const fieldWidth = kit.contentWidth - photoW - 16;
    let y = photoY;
    for (const [label, value] of studentFields(subject)) {
      doc.font(FONT.bold).fontSize(8).fillColor(THEME.muted).text(label.toUpperCase(), kit.x0, y, { width: fieldWidth });
      doc.font(FONT.regular).fontSize(11).fillColor(THEME.ink).text(value || '-', kit.x0, y + 12, { width: fieldWidth });
      y += 30;
    }
    doc.y = Math.max(y, photoY + photoH + 16);

    kit.fieldGrid([
      ['Exam', 'Annual / Term Examination'],
      ['Session', String(new Date().getFullYear())],
      ['Exam Center', school.name],
      ['Issue Date', dateText()],
    ]);
    kit.calloutBox('The student must bring this admit card, arrive on time, and follow all examination rules.', 'warning');
    kit.signatureRow(['Class Teacher', 'Exam Controller', 'Principal']);
    await kit.verifyFooter(verify);
  });
}

export async function buildFeeReceiptPdf({ school, subject, ledger, paymentId, verify }) {
  const payment = ledger?.payments?.find((p) => p.id === paymentId) || ledger?.payments?.[0];
  const invoice = payment ? ledger?.invoices?.find((i) => i.id === payment.invoiceId) : null;
  return renderPdf({ schoolName: school.name }, async (doc) => {
    const kit = new SchoolDocPdf(doc, school);
    kit.watermark();
    await kit.letterhead({ title: 'Fee Receipt', subtitle: 'Official payment acknowledgement' });

    if (!payment) {
      doc.font(FONT.regular).fontSize(11).fillColor(THEME.faint)
        .text('No payment receipt is available.', kit.x0, doc.y + 30, { width: kit.contentWidth, align: 'center' });
      kit.signatureRow(['Collected By', 'Accounts Officer', 'Principal']);
      await kit.verifyFooter(verify);
      return;
    }

    kit.fieldGrid([
      ['Receipt No', payment.receiptNumber],
      ['Payment Date', dateText(payment.paymentDate)],
      ['Student Name', subject.name || payment.studentName],
      ['Class', `${subject.className || invoice?.className || ''}${subject.section ? ` - ${subject.section}` : ''}`],
      ['Period', invoice?.period],
      ['Payment Method', payment.method],
    ]);

    kit.table({
      columns: [{ label: 'Item', width: 0.6 }, { label: 'Amount', width: 0.4, align: 'right' }],
      rows: [
        ['Invoice Title', invoice?.title || '-'],
        ['Invoice Total', money(invoice?.totalAmount)],
        [{ text: 'Amount Paid', color: THEME.success }, { text: money(payment.amount), color: THEME.success }],
        [{ text: 'Remaining Due', color: THEME.danger }, { text: money(invoice?.dueAmount), color: THEME.danger }],
      ],
    });

    if (payment.referenceNo) {
      doc.font(FONT.regular).fontSize(9).fillColor(THEME.muted)
        .text(`Reference: ${payment.referenceNo}`, kit.x0, doc.y, { width: kit.contentWidth });
      doc.moveDown(0.6);
    }
    kit.signatureRow(['Collected By', 'Accounts Officer', 'Principal']);
    await kit.verifyFooter(verify);
  });
}

// CR80 card size (85.6mm x 53.98mm), landscape, single card per PDF —
// printer-ready rather than an A4 page with a small card floating on it.
export async function buildIdCardPdf({ school, subject, verify }) {
  return renderPdf({ schoolName: school.name, size: [242.65, 153.07], layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 } }, async (doc) => {
    const w = doc.page.width, h = doc.page.height;
    doc.rect(0, 0, w, h).fill('#ffffff');
    doc.rect(0, 0, w, 40).fill(THEME.brand);

    const logoBuf = await loadImageBuffer(school.logoUrl);
    if (logoBuf) {
      try { doc.image(logoBuf, 8, 7, { fit: [26, 26] }); } catch { /* skip */ }
    }
    doc.font(FONT.bold).fontSize(9).fillColor('#ffffff')
      .text(school.name.toUpperCase(), 38, 8, { width: w - 46, height: 14, ellipsis: true });
    doc.font(FONT.regular).fontSize(6).fillColor('#d8d5ea')
      .text('STUDENT IDENTITY CARD', 38, 20, { width: w - 46 });

    const photoW = 58, photoH = 68, photoX = 10, photoY = 50;
    const kit = new SchoolDocPdf(doc, school);
    const buf = await photoBuffer(subject);
    drawPhotoBox(kit, buf, photoX, photoY, photoW, photoH);

    const infoX = photoX + photoW + 10;
    const infoW = w - infoX - 8;
    doc.font(FONT.bold).fontSize(10).fillColor(THEME.brandStrong)
      .text(subject.name, infoX, 50, { width: infoW, ellipsis: true });
    doc.font(FONT.bold).fontSize(8).fillColor(THEME.brand)
      .text(subject.studentId || 'ID Pending', infoX, 63, { width: infoW });

    // Label above value, both height-capped with ellipsis rather than left
    // to wrap — a long guardian name wrapping to a second line would run
    // straight into the next field on a card this small, so every row gets
    // a fixed slot instead of a measured one.
    const lines = [
      ['Class', `${subject.className || '-'}${subject.section ? ` - ${subject.section}` : ''}`],
      ['Roll', subject.rollNumber || '-'],
      ['Guardian', subject.guardianName || '-'],
      ['Phone', subject.phone || subject.guardianPhone || '-'],
    ];
    const rowHeight = 13;
    let y = 79;
    lines.forEach(([label, value]) => {
      doc.font(FONT.bold).fontSize(5.5).fillColor(THEME.muted)
        .text(label.toUpperCase(), infoX, y, { width: infoW, height: 7, ellipsis: true });
      doc.font(FONT.regular).fontSize(7).fillColor(THEME.ink)
        .text(String(value || '-'), infoX, y + 6, { width: infoW, height: 8, ellipsis: true });
      y += rowHeight;
    });

    doc.moveTo(10, h - 22).lineTo(w - 10, h - 22).lineWidth(0.5).strokeColor(THEME.line).stroke();
    doc.font(FONT.regular).fontSize(5.5).fillColor(THEME.faint)
      .text('Authorized Signature', 10, h - 16, { width: 100 });

    // Dedicated footer strip (below the field rows, which stop at y≈131)
    // so the QR never competes with field text for space.
    if (verify?.url) {
      try {
        const qrBuf = await buildVerifyQrPng(verify.url);
        doc.image(qrBuf, w - 26, h - 20, { width: 16, height: 16 });
      } catch { /* verification QR is a nice-to-have, never block issuing the card */ }
    } else {
      doc.font(FONT.regular).fontSize(5.5).fillColor(THEME.faint)
        .text(`Valid ${new Date().getFullYear()}`, w - 70, h - 16, { width: 60, align: 'right' });
    }
  });
}

const PDFDocument = require('pdfkit');

function generateHoldingStatementPDF(res, {
  settings,
  shareholder,
  asAtDate,
  sharesHeld,
  issuedSharesTotal,
  ownershipPercent,
  valuation,
  holdingValue,
  ledgerEntries
}) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  const safeId = (shareholder.shareholderId || 'SH').replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `Holding_Statement_${safeId}_${asAtDate || 'Current'}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Header Banner
  doc.rect(0, 0, doc.page.width, 110).fill('#0A1128');
  doc
    .fillColor('#D4AF37')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('OFFICIAL SHAREHOLDER HOLDING STATEMENT • DATED SNAPSHOT', 50, 28, { characterSpacing: 1.2 });

  doc
    .fillColor('#FFFFFF')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(settings.companyDisplayName || 'NIA Group of Company', 50, 46);

  doc
    .fillColor('#94A3B8')
    .fontSize(9)
    .font('Helvetica')
    .text(
      `Share Class: ${settings.shareClass || 'Ordinary'}   |   Currency: ${settings.baseCurrency || 'LKR'}   |   Snapshot Date: ${asAtDate}`,
      50,
      74
    );

  // Shareholder Details Box
  doc.y = 130;
  doc.roundedRect(50, 130, 495, 85, 6).fillAndStroke('#F8FAFC', '#E2E8F0');

  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('Shareholder Identity & Registry Record', 65, 144);
  doc.fontSize(9.5).font('Helvetica').fillColor('#334155');
  doc.text(`Shareholder Name: ${shareholder.fullName}`, 65, 164);
  doc.text(`Shareholder ID: ${shareholder.shareholderId}`, 65, 180);
  doc.text(`Account Status: ${shareholder.accountStatus}`, 65, 196);

  doc.text(`Holder Type: ${shareholder.shareholderType || 'Individual'}`, 310, 164);
  doc.text(`Share Class: ${shareholder.shareClass || settings.shareClass || 'Ordinary'}`, 310, 180);
  doc.text(`Voting Rights: ${shareholder.votingRights || 'Per company rules'}`, 310, 196);

  // Summary Metrics Row
  const currency = settings.baseCurrency || 'LKR';
  const valPerShare = valuation ? Number(valuation.valuePerShare).toFixed(2) : '0.00';

  const cardY = 232;
  const cards = [
    { label: 'PUBLISHED SHARES', value: Number(sharesHeld).toLocaleString(), sub: `${settings.shareClass || 'Ordinary'} units` },
    { label: 'OWNERSHIP SHARE', value: ownershipPercent !== null ? `${ownershipPercent}%` : 'N/A', sub: `Of ${Number(issuedSharesTotal).toLocaleString()} issued` },
    { label: 'VALUE PER SHARE', value: `${currency} ${valPerShare}`, sub: valuation ? `Effective ${valuation.effectiveDate}` : 'No published value' },
    { label: 'HOLDING VALUE', value: `${currency} ${Number(holdingValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'Calculated as-at value' }
  ];

  cards.forEach((c, idx) => {
    const x = 50 + idx * 126;
    doc.roundedRect(x, cardY, 118, 68, 5).fillAndStroke('#FFFFFF', '#CBD5E1');
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text(c.label, x + 10, cardY + 11);
    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(c.value, x + 10, cardY + 27, { width: 98 });
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(c.sub, x + 10, cardY + 49, { width: 98 });
  });

  // Ledger Table
  let currentY = 322;
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('Published Share Movement Ledger', 50, currentY);
  currentY += 20;

  doc.rect(50, currentY, 495, 22).fill('#0F172A');
  doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
  doc.text('Reference', 60, currentY + 7);
  doc.text('Effective Date', 145, currentY + 7);
  doc.text('Movement Type', 235, currentY + 7);
  doc.text('Movement', 375, currentY + 7);
  doc.text('Running Balance', 450, currentY + 7);
  currentY += 22;

  if (!ledgerEntries || ledgerEntries.length === 0) {
    doc.rect(50, currentY, 495, 30).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('No published share movements as at the selected statement date.', 60, currentY + 10);
    currentY += 35;
  } else {
    ledgerEntries.forEach((row, idx) => {
      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
      }
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(50, currentY, 495, 22).fillAndStroke(bg, '#E2E8F0');
      doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(row.reference, 60, currentY + 7);
      doc.font('Helvetica').fillColor('#334155').text(row.effectiveDate, 145, currentY + 7);
      doc.text(row.movementType, 235, currentY + 7, { width: 130 });
      doc.font('Helvetica-Bold').fillColor(row.signedQuantity >= 0 ? '#059669' : '#DC2626').text(row.movementDisplay, 375, currentY + 7);
      doc.fillColor('#0F172A').text(Number(row.balanceAfter).toLocaleString(), 450, currentY + 7);
      currentY += 22;
    });
  }

  // Footer Notice
  currentY += 24;
  if (currentY > 700) {
    doc.addPage();
    currentY = 50;
  }
  doc.roundedRect(50, currentY, 495, 76, 5).fillAndStroke('#FFFBEB', '#FDE68A');
  doc.fillColor('#92400E').fontSize(8.5).font('Helvetica-Bold').text('Calculation Basis & Official Digital Branch Notice', 62, currentY + 10);
  doc
    .fillColor('#78350F')
    .fontSize(7.5)
    .font('Helvetica')
    .text(
      `This statement is generated from a dated snapshot as at ${asAtDate}. Holding value equals published shares multiplied by the applicable published value per share. This calculated total is not an audited enterprise valuation or guaranteed selling price. Nexus International Alliance (NIA) operates through its 60 Digital Branch Locations across all 25 districts of Sri Lanka. Please do not visit or send documents/parcels to previous physical branch addresses without management approval. Generated on ${new Date().toISOString()} (${settings.businessTimezone || 'Asia/Colombo'}).`,
      62,
      currentY + 23,
      { width: 470 }
    );

  doc.end();
}

function generateAdminReportPDF(res, { reportType, title, asAtDate, settings, columns, rows, summaryNote }) {
  const doc = new PDFDocument({ margin: 45, size: 'A4' });
  const filename = `${reportType}_${asAtDate || 'Report'}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  doc.rect(0, 0, doc.page.width, 95).fill('#0A1128');
  doc.fillColor('#D4AF37').fontSize(8.5).font('Helvetica-Bold').text('ADMINISTRATION & GOVERNANCE REPORT', 45, 24);
  doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text(title, 45, 40);
  doc
    .fillColor('#94A3B8')
    .fontSize(9)
    .font('Helvetica')
    .text(
      `${settings.companyDisplayName || 'NIA Group of Company'}  |  As at: ${asAtDate}  |  Share Class: ${settings.shareClass || 'Ordinary'}`,
      45,
      66
    );

  let y = 115;
  if (summaryNote) {
    doc.roundedRect(45, y, 505, 36, 5).fillAndStroke('#F1F5F9', '#CBD5E1');
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(summaryNote, 57, y + 12, { width: 480 });
    y += 50;
  }

  const colWidth = Math.floor(505 / columns.length);
  doc.rect(45, y, 505, 22).fill('#0F172A');
  doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
  columns.forEach((col, i) => {
    doc.text(col.header, 52 + i * colWidth, y + 7, { width: colWidth - 10 });
  });
  y += 22;

  if (!rows || rows.length === 0) {
    doc.rect(45, y, 505, 28).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('No matching records found for this dated report.', 55, y + 9);
    y += 28;
  } else {
    rows.forEach((r, idx) => {
      if (y > 740) {
        doc.addPage();
        y = 50;
      }
      doc.rect(45, y, 505, 22).fillAndStroke(idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC', '#E2E8F0');
      doc.fillColor('#1E293B').fontSize(8).font('Helvetica');
      columns.forEach((col, i) => {
        doc.text(String(r[col.key] ?? ''), 52 + i * colWidth, y + 7, { width: colWidth - 10 });
      });
      y += 22;
    });
  }

  doc.end();
}

module.exports = {
  generateHoldingStatementPDF,
  generateAdminReportPDF
};

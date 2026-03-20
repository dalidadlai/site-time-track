import { Project, CompanyProfile, SiteManager, calculateWorkerHours, taskTotalHours, dayworkTotalHours } from '@/lib/types';
import { format } from 'date-fns';

export function generateDayworkPdf(project: Project, company: CompanyProfile, siteManagers: SiteManager[], dayworkIds?: string[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const allDays = [...project.dayworks].sort((a, b) => a.date.localeCompare(b.date));
  const selectedDays = dayworkIds ? allDays.filter(dw => dayworkIds.includes(dw.id)) : allDays;

  if (selectedDays.length === 0) return;

  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; padding: 24px; font-size: 11px; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: avoid; }
      h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
      h2 { font-size: 13px; font-weight: 600; margin: 16px 0 6px; border-bottom: 2px solid #c2702a; padding-bottom: 4px; }
      .meta { color: #555; font-size: 10px; line-height: 1.6; }
      .meta strong { color: #1a1a2e; }
      table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
      th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; }
      th { background: #f5f0eb; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
      .total-row { font-weight: 600; background: #faf6f1; }
      .hours { text-align: right; font-variant-numeric: tabular-nums; }
      .task-header { background: #f8f4ef; padding: 8px 10px; border: 1px solid #e5ddd3; border-bottom: none; margin-top: 14px; }
      .task-header .label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
      .task-header .value { font-size: 11px; font-weight: 500; }
      .sig-section { margin-top: 40px; page-break-inside: avoid; max-width: 320px; }
      .sig-img { max-height: 60px; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 6px; }
      .sig-line { border-bottom: 1px solid #333; height: 48px; margin-bottom: 6px; }
      .sig-label { font-size: 10px; color: #666; }
      .header-bar { background: #c2702a; color: white; padding: 12px 16px; margin: -24px -24px 16px; }
      .header-bar h1 { color: white; }
      .company-info { font-size: 10px; color: rgba(255,255,255,0.85); line-height: 1.5; }
      .day-total { background: #e8ddd0; padding: 8px 10px; font-weight: 700; font-size: 12px; margin-top: 8px; }
      .day-separator { border-top: 3px solid #c2702a; margin-top: 32px; padding-top: 16px; }
      @media print {
        body { padding: 0; }
        .header-bar { margin: 0 0 16px; padding: 12px 16px; }
      }
    </style>
  `;

  const dayPages = selectedDays.map((dw, idx) => {
    const totalHrs = dayworkTotalHours(dw);

    const taskSections = dw.tasks.map(task => {
      const sm = siteManagers.find(s => s.id === task.siteManagerId);
      const tHrs = taskTotalHours(task);

      const workerRows = task.workerLogs.map(log => {
        const hrs = calculateWorkerHours(log);
        return `<tr><td>${log.workerName}${log.workerRole ? ' (' + log.workerRole + ')' : ''}</td><td class="hours">${hrs.toFixed(1)}</td></tr>`;
      }).join('');

      return `
        <div class="task-header">
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div><span class="label">Work Area</span><br><span class="value">${task.workArea || '—'}</span></div>
            <div style="flex:1"><span class="label">Description</span><br><span class="value">${task.description}</span></div>
            ${sm ? `<div><span class="label">Site Manager</span><br><span class="value">${sm.name}${sm.phone ? ' · ' + sm.phone : ''}</span></div>` : ''}
          </div>
        </div>
        <table>
          <thead><tr><th>Worker</th><th class="hours">Hours</th></tr></thead>
          <tbody>
            ${workerRows}
            <tr class="total-row"><td>Task Total</td><td class="hours">${tHrs.toFixed(1)}</td></tr>
          </tbody>
        </table>
      `;
    }).join('');

    const sigHtml = dw.signatureData && dw.signatureData.startsWith('data:')
      ? `<img src="${dw.signatureData}" class="sig-img" alt="Signature" />`
      : (dw.signatureData ? '<span style="font-style:italic;color:#666;padding-top:24px;display:block;">Signed</span>' : '');

    return `
      <div class="${idx < selectedDays.length - 1 ? 'page' : ''}">
        ${idx === 0 ? `
          <div class="header-bar">
            ${company.name ? `<h1>${company.name}</h1>` : '<h1>Daywork Report</h1>'}
            <div class="company-info">
              ${[company.address, company.email, company.phone].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div class="meta" style="margin-bottom:16px;">
            <strong>Project:</strong> ${project.name}<br>
            <strong>Client:</strong> ${project.client || '—'}<br>
            <strong>Site Address:</strong> ${project.siteAddress || '—'}
          </div>
        ` : ''}

        <h2>${format(new Date(dw.date + 'T00:00:00'), 'EEEE, d MMMM yyyy')}</h2>
        <div class="meta" style="margin-bottom:8px;">
          ${dw.siteContactName ? `<strong>Site Contact:</strong> ${dw.siteContactName}${dw.siteContactPhone ? ' · ' + dw.siteContactPhone : ''}<br>` : ''}
          ${dw.purchaseOrder ? `<strong>PO / Contract:</strong> ${dw.purchaseOrder}<br>` : ''}
        </div>

        ${taskSections}

        <div class="day-total">Day Total: ${totalHrs.toFixed(1)} hours</div>

        <div class="sig-section">
          <div class="sig-block">
            ${sigHtml || '<div class="sig-line"></div>'}
            <div class="sig-label">Site Manager / Client Signature</div>
            <div class="sig-label" style="margin-top:10px;">Name: ${dw.signatureName || '_______________________'}</div>
            <div class="sig-label" style="margin-top:6px;">Date: ${dw.signatureDate || '_______________________'}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Daywork Report - ${project.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      ${styles}
    </head>
    <body>
      ${dayPages || '<p>No daywork records to display.</p>'}
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

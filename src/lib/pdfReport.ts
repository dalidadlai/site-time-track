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
      body { font-family: 'Inter', Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 0; font-size: 11px; line-height: 1.5; }
      .page { page-break-after: always; padding: 40px; }
      .page:last-child { page-break-after: avoid; }

      /* Header */
      .header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 8px; }
      .header-logo { height: 48px; width: auto; flex-shrink: 0; }
      .header-info { flex: 1; }
      .company-name { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.2; margin-bottom: 4px; }
      .company-contact { font-size: 10px; color: #555; line-height: 1.6; }
      .header-divider { border: none; border-top: 2px solid #1a1a1a; margin: 12px 0 16px; }

      /* Project meta */
      .project-meta { font-size: 11px; color: #333; line-height: 1.8; margin-bottom: 20px; }
      .project-meta strong { color: #1a1a1a; }

      /* Date heading */
      .date-heading { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
      .day-meta { font-size: 10px; color: #555; line-height: 1.7; margin-bottom: 16px; }

      /* Task block */
      .task-block { margin-bottom: 24px; page-break-inside: avoid; }
      .section-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 2px; margin-top: 14px; }
      .task-block .section-label:first-child { margin-top: 0; }
      .section-value { font-size: 11px; color: #1a1a1a; line-height: 1.6; white-space: pre-line; }

      /* Worker table */
      .worker-table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 6px; }
      .worker-table th { text-align: left; font-size: 10px; font-weight: 600; color: #555; padding: 4px 0; border-bottom: 1px solid #ddd; }
      .worker-table th.hours-col { text-align: right; width: 70px; }
      .worker-table td { padding: 4px 0; font-size: 11px; border-bottom: 1px solid #eee; }
      .worker-table td.hours-val { text-align: right; font-variant-numeric: tabular-nums; }
      .task-total { font-size: 11px; font-weight: 600; text-align: right; margin-top: 4px; padding-top: 4px; }

      /* Task separator */
      .task-separator { border: none; border-top: 1px solid #ddd; margin: 0 0 16px; }

      /* Day total */
      .day-total { font-size: 13px; font-weight: 700; margin-top: 20px; padding-top: 10px; border-top: 2px solid #1a1a1a; }

      /* Signature */
      .sig-section { margin-top: 48px; page-break-inside: avoid; max-width: 340px; }
      .sig-title { font-size: 11px; font-weight: 700; margin-bottom: 20px; }
      .sig-row { margin-bottom: 16px; }
      .sig-img { max-height: 56px; display: block; margin-bottom: 4px; }
      .sig-line { border-bottom: 1px solid #333; height: 36px; }
      .sig-label { font-size: 10px; color: #555; margin-top: 4px; }

      /* Day separator */
      .day-separator { border: none; border-top: 3px solid #1a1a1a; margin: 32px 0 20px; }

      @page { margin: 18mm 15mm; size: A4; }
      @media print {
        body { padding: 0; }
        .page { padding: 0; }
      }
    </style>
  `;

  const dayPages = selectedDays.map((dw, idx) => {
    const totalHrs = dayworkTotalHours(dw);

    const taskSections = dw.tasks.map((task, tIdx) => {
      const sm = siteManagers.find(s => s.id === task.siteManagerId);
      const tHrs = taskTotalHours(task);

      const workerRows = task.workerLogs.map(log => {
        const hrs = calculateWorkerHours(log);
        return `<tr><td>${log.workerName}${log.workerRole ? ' (' + log.workerRole + ')' : ''}</td><td class="hours-val">${hrs.toFixed(1)}</td></tr>`;
      }).join('');

      return `
        ${tIdx > 0 ? '<hr class="task-separator">' : ''}
        <div class="task-block">
          <div class="section-label">Work Area</div>
          <div class="section-value">${task.workArea || '—'}</div>

          <div class="section-label">Description</div>
          <div class="section-value">${task.description || '—'}</div>

          ${sm ? `
            <div class="section-label">Site Manager</div>
            <div class="section-value">${sm.name}${sm.phone ? ' · ' + sm.phone : ''}</div>
          ` : ''}

          <div class="section-label">Worker Hours</div>
          <table class="worker-table">
            <thead><tr><th>Worker</th><th class="hours-col">Hours</th></tr></thead>
            <tbody>${workerRows}</tbody>
          </table>
          <div class="task-total">Task Total: ${tHrs.toFixed(1)} hours</div>
        </div>
      `;
    }).join('');

    const sigHtml = dw.signatureData && dw.signatureData.startsWith('data:')
      ? `<img src="${dw.signatureData}" class="sig-img" alt="Signature" />`
      : '';

    return `
      <div class="page">
        ${idx === 0 ? `
          <div class="header">
            ${company.logo ? `<img src="${company.logo}" class="header-logo" alt="Logo" />` : ''}
            <div class="header-info">
              <div class="company-name">${company.name || 'Daywork Report'}</div>
              <div class="company-contact">${[company.address, company.email, company.phone].filter(Boolean).join(' &nbsp;·&nbsp; ')}</div>
            </div>
          </div>
          <hr class="header-divider">
          <div class="project-meta">
            <strong>Project:</strong> ${project.name}<br>
            <strong>Client:</strong> ${project.client || '—'}<br>
            <strong>Site Address:</strong> ${project.siteAddress || '—'}
          </div>
        ` : ''}

        ${idx > 0 ? '<hr class="day-separator">' : ''}

        <div class="date-heading">${format(new Date(dw.date + 'T00:00:00'), 'EEEE, d MMMM yyyy')}</div>
        <div class="day-meta">
          ${dw.siteContactName ? `<strong>Site Contact:</strong> ${dw.siteContactName}${dw.siteContactPhone ? ' · ' + dw.siteContactPhone : ''}<br>` : ''}
          ${dw.purchaseOrder ? `<strong>PO / Contract:</strong> ${dw.purchaseOrder}<br>` : ''}
        </div>

        ${taskSections}

        <div class="day-total">Day Total: ${totalHrs.toFixed(1)} hours</div>

        <div class="sig-section">
          <div class="sig-title">Site Manager Signature</div>
          <div class="sig-row">
            ${sigHtml || '<div class="sig-line"></div>'}
            <div class="sig-label">Signature</div>
          </div>
          <div class="sig-row">
            ${dw.signatureName ? `<div style="font-size:11px;padding-bottom:4px;">${dw.signatureName}</div>` : '<div class="sig-line"></div>'}
            <div class="sig-label">Name</div>
          </div>
          <div class="sig-row">
            ${dw.signatureDate ? `<div style="font-size:11px;padding-bottom:4px;">${dw.signatureDate}</div>` : '<div class="sig-line"></div>'}
            <div class="sig-label">Date</div>
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

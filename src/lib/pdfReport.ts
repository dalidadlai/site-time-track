import { Project, CompanyProfile, SiteManager, calculateWorkerHours, taskTotalHours, dayworkTotalHours } from '@/lib/types';
import { format } from 'date-fns';

export function generateDayworkPdf(project: Project, company: CompanyProfile, siteManagers: SiteManager[], dayworkIds?: string[], siteManagerId?: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const allDays = [...project.dayworks].sort((a, b) => a.date.localeCompare(b.date));
  let selectedDays = dayworkIds ? allDays.filter(dw => dayworkIds.includes(dw.id)) : allDays;

  // Optionally restrict the report to tasks under one site manager
  if (siteManagerId) {
    selectedDays = selectedDays
      .map(dw => ({ ...dw, tasks: dw.tasks.filter(t => t.siteManagerId === siteManagerId) }))
      .filter(dw => dw.tasks.length > 0);
  }

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
      .header-bar { background: #c2702a; color: white; padding: 24px 28px 18px; margin: -24px -24px 0; display: flex; align-items: center; gap: 18px; }
      .header-logo { height: 54px; width: auto; flex-shrink: 0; background: white; border-radius: 4px; padding: 4px; }
      .header-text { flex: 1; }
      .header-text .company-name { font-size: 28px; font-weight: 700; color: white; letter-spacing: -0.3px; margin: 0 0 6px; line-height: 1.15; }
      .header-text .company-details { font-size: 10px; color: rgba(255,255,255,0.82); line-height: 1.6; letter-spacing: 0.2px; }
      .header-divider { height: 3px; background: linear-gradient(to right, #a35a1f, #d4853a, #a35a1f); margin: 0 -24px 18px; }
      .day-total { background: #e8ddd0; padding: 8px 10px; font-weight: 700; font-size: 12px; margin-top: 8px; }
      .day-separator { border-top: 3px solid #c2702a; margin-top: 32px; padding-top: 16px; }
      @page {
        margin: 20mm 15mm;
        size: A4;
      }
      @media print {
        body { padding: 0; margin: 0; }
        .header-bar { margin: 0 0 0; padding: 24px 28px 18px; }
        .header-divider { margin: 0 0 18px; }
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
            <div style="flex:1"><span class="label">Description</span><br><span class="value" style="white-space:pre-line;">${task.description}</span></div>
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
             ${company.logo ? `<img src="${company.logo}" class="header-logo" alt="Logo" />` : ''}
             <div class="header-text">
               ${company.name ? `<div class="company-name">${company.name}</div>` : '<div class="company-name">Daywork Report</div>'}
               <div class="company-details">
                 ${[company.address, company.email, company.phone].filter(Boolean).join(' &nbsp;·&nbsp; ')}
               </div>
             </div>
           </div>
          <div class="header-divider"></div>
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

  // Weekly summary if multiple days selected
  const summaryHtml = selectedDays.length > 1 ? (() => {
    const grandTotal = selectedDays.reduce((sum, dw) => sum + dayworkTotalHours(dw), 0);
    const summaryRows = selectedDays.map(dw => {
      const hrs = dayworkTotalHours(dw);
      return `<tr><td>${format(new Date(dw.date + 'T00:00:00'), 'EEE, d MMM yyyy')}</td><td class="hours">${dw.tasks.length}</td><td class="hours">${hrs.toFixed(1)}</td></tr>`;
    }).join('');

    // Aggregate hours per worker
    const workerMap = new Map<string, number>();
    selectedDays.forEach(dw => {
      dw.tasks.forEach(task => {
        task.workerLogs.forEach(log => {
          const hrs = calculateWorkerHours(log);
          const name = log.workerName || 'Unknown';
          workerMap.set(name, (workerMap.get(name) || 0) + hrs);
        });
      });
    });
    const workerRows = [...workerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, hrs]) => `<tr><td>${name}</td><td class="hours">${hrs.toFixed(1)}</td></tr>`)
      .join('');

    return `
      <div style="page-break-before: always;">
        <h2>Hours by Worker</h2>
        <table>
          <thead><tr><th>Worker</th><th class="hours">Total Hours</th></tr></thead>
          <tbody>
            ${workerRows}
            <tr class="total-row"><td>Grand Total</td><td class="hours">${grandTotal.toFixed(1)}</td></tr>
          </tbody>
        </table>
      </div>
    `;
  })() : '';

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
      ${summaryHtml}
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

// Compact Job Sheet: covers multiple days in one continuous sheet,
// each worker shown with TOTAL HOURS only (no start/finish times).
export function generateJobSheetPdf(project: Project, company: CompanyProfile, siteManagers: SiteManager[], dayworkIds?: string[], siteManagerId?: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const allDays = [...project.dayworks].sort((a, b) => a.date.localeCompare(b.date));
  let days = dayworkIds ? allDays.filter(dw => dayworkIds.includes(dw.id)) : allDays;

  if (siteManagerId) {
    days = days
      .map(dw => ({ ...dw, tasks: dw.tasks.filter(t => t.siteManagerId === siteManagerId) }))
      .filter(dw => dw.tasks.length > 0);
  }
  if (days.length === 0) return;

  const fmt = (d: string) => format(new Date(d + 'T00:00:00'), 'EEE, d MMM yyyy');
  const rangeLabel = days.length === 1
    ? fmt(days[0].date)
    : `${fmt(days[0].date)}  —  ${fmt(days[days.length - 1].date)}  (${days.length} days)`;

  const grandTotal = days.reduce((s, dw) => s + dayworkTotalHours(dw), 0);

  const workerMap = new Map<string, number>();
  days.forEach(dw => dw.tasks.forEach(t => t.workerLogs.forEach(l => {
    const name = l.workerName || 'Unknown';
    workerMap.set(name, (workerMap.get(name) || 0) + calculateWorkerHours(l));
  })));

  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; padding: 24px; font-size: 11px; }
      .header-bar { background: #c2702a; color: white; padding: 20px 24px 14px; margin: -24px -24px 0; display: flex; align-items: center; gap: 16px; }
      .header-logo { height: 48px; width: auto; background: white; border-radius: 4px; padding: 4px; }
      .company-name { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
      .company-details { font-size: 10px; color: rgba(255,255,255,0.85); line-height: 1.5; }
      .header-divider { height: 3px; background: linear-gradient(to right,#a35a1f,#d4853a,#a35a1f); margin: 0 -24px 14px; }
      .title { font-size: 15px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; }
      .meta { color: #555; font-size: 10px; line-height: 1.6; }
      .meta strong { color: #1a1a2e; }
      h2 { font-size: 12px; font-weight: 600; margin: 16px 0 4px; border-bottom: 2px solid #c2702a; padding-bottom: 3px; }
      table { width: 100%; border-collapse: collapse; margin: 4px 0 10px; }
      th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; vertical-align: top; }
      th { background: #f5f0eb; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
      .hours { text-align: right; width: 70px; font-variant-numeric: tabular-nums; }
      .total-row { font-weight: 600; background: #faf6f1; }
      .day-block { page-break-inside: avoid; }
      .sig-section { margin-top: 32px; page-break-inside: avoid; max-width: 320px; }
      .sig-img { max-height: 60px; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 6px; }
      .sig-line { border-bottom: 1px solid #333; height: 48px; margin-bottom: 6px; }
      .sig-label { font-size: 10px; color: #666; }
      @page { margin: 20mm 15mm; size: A4; }
      @media print { body { padding: 0; } .header-bar { margin: 0; } .header-divider { margin: 0 0 14px; } }
    </style>
  `;

  const dayBlocks = days.map(dw => {
    const rows = dw.tasks.map(task => {
      const sm = siteManagers.find(s => s.id === task.siteManagerId);
      const workerRows = task.workerLogs.map(l =>
        `<tr><td>${l.workerName}${l.workerRole ? ' (' + l.workerRole + ')' : ''}</td><td class="hours">${calculateWorkerHours(l).toFixed(1)}</td></tr>`
      ).join('');
      return `
        <tr>
          <td style="width:110px;">${task.workArea || '—'}</td>
          <td><span style="white-space:pre-line;">${task.description}</span>${sm ? `<div style="color:#777;margin-top:3px;">Site Manager: ${sm.name}${sm.phone ? ' · ' + sm.phone : ''}</div>` : ''}</td>
          <td style="padding:0;">
            <table style="margin:0;border:none;">${workerRows || '<tr><td>—</td><td class="hours">0.0</td></tr>'}
              <tr class="total-row"><td>Total</td><td class="hours">${taskTotalHours(task).toFixed(1)}</td></tr>
            </table>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="day-block">
        <h2>${fmt(dw.date)} — ${dayworkTotalHours(dw).toFixed(1)} hrs</h2>
        <table>
          <thead><tr><th>Work Area</th><th>Description</th><th style="width:210px;">Workers / Total Hours</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  const workerSummary = `
    <h2>Hours by Worker</h2>
    <table>
      <thead><tr><th>Worker</th><th class="hours">Total Hours</th></tr></thead>
      <tbody>
        ${[...workerMap.entries()].sort((a, b) => b[1] - a[1]).map(([n, h]) => `<tr><td>${n}</td><td class="hours">${h.toFixed(1)}</td></tr>`).join('')}
        <tr class="total-row"><td>Grand Total</td><td class="hours">${grandTotal.toFixed(1)}</td></tr>
      </tbody>
    </table>`;

  const lastSigned = [...days].reverse().find(d => d.signatureData);
  const sigHtml = lastSigned?.signatureData?.startsWith('data:')
    ? `<img src="${lastSigned.signatureData}" class="sig-img" alt="Signature" />`
    : '<div class="sig-line"></div>';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><title>Job Sheet - ${project.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    ${styles}</head>
    <body>
      <div class="header-bar">
        ${company.logo ? `<img src="${company.logo}" class="header-logo" alt="Logo" />` : ''}
        <div>
          <div class="company-name">${company.name || 'Job Sheet'}</div>
          <div class="company-details">${[company.address, company.email, company.phone].filter(Boolean).join(' &nbsp;·&nbsp; ')}</div>
        </div>
      </div>
      <div class="header-divider"></div>
      <div class="title">Job Sheet</div>
      <div class="meta" style="margin-bottom:12px;">
        <strong>Project:</strong> ${project.name}<br>
        <strong>Client:</strong> ${project.client || '—'}<br>
        <strong>Site Address:</strong> ${project.siteAddress || '—'}<br>
        <strong>Dates:</strong> ${rangeLabel}
      </div>
      ${dayBlocks}
      ${workerSummary}
      <div class="sig-section">
        ${sigHtml}
        <div class="sig-label">Site Manager / Client Signature</div>
        <div class="sig-label" style="margin-top:10px;">Name: ${lastSigned?.signatureName || '_______________________'}</div>
        <div class="sig-label" style="margin-top:6px;">Date: ${lastSigned?.signatureDate || '_______________________'}</div>
      </div>
    </body></html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

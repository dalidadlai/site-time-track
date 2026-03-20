import { Project, DayRecord, calculateHours, taskTotalHours, dayTotalHours } from '@/lib/types';
import { format } from 'date-fns';

export function generateDayworkPdf(project: Project) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; padding: 24px; font-size: 11px; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: avoid; }
      h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
      h2 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; border-bottom: 2px solid #c2702a; padding-bottom: 4px; }
      .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
      th { background: #f5f0eb; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
      .total-row { font-weight: 600; background: #faf6f1; }
      .hours { text-align: right; font-variant-numeric: tabular-nums; }
      .sig-section { display: flex; gap: 48px; margin-top: 40px; page-break-inside: avoid; }
      .sig-block { flex: 1; }
      .sig-line { border-bottom: 1px solid #333; height: 48px; margin-bottom: 6px; }
      .sig-label { font-size: 10px; color: #666; }
      .header-bar { background: #c2702a; color: white; padding: 12px 16px; margin: -24px -24px 20px; }
      .header-bar h1 { color: white; }
      .header-bar .meta { color: rgba(255,255,255,0.85); }
      @media print {
        body { padding: 0; }
        .header-bar { margin: 0 0 20px; padding: 12px 16px; }
      }
    </style>
  `;

  const sortedDays = [...project.days].sort((a, b) => a.date.localeCompare(b.date));

  const dayPages = sortedDays.map((day, idx) => {
    const totalHrs = dayTotalHours(day);
    const taskRows = day.tasks.map(task => {
      const workerRows = task.workers.map(w => {
        const hrs = calculateHours(w);
        return `<tr>
          <td>${w.name}</td>
          <td>${w.startTime}</td>
          <td>${w.finishTime}</td>
          <td class="hours">${w.breakMinutes} min</td>
          <td class="hours">${hrs.toFixed(1)}</td>
        </tr>`;
      }).join('');

      const tHrs = taskTotalHours(task);
      return `
        <h2>${task.description}</h2>
        <table>
          <thead>
            <tr><th>Worker</th><th>Start</th><th>Finish</th><th>Break</th><th class="hours">Hours</th></tr>
          </thead>
          <tbody>
            ${workerRows}
            <tr class="total-row">
              <td colspan="4">Task Total</td>
              <td class="hours">${tHrs.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      `;
    }).join('');

    return `
      <div class="${idx < sortedDays.length - 1 ? 'page' : ''}">
        ${idx === 0 ? `
          <div class="header-bar">
            <h1>${project.name}</h1>
            <div class="meta">${project.client}${project.location ? ' · ' + project.location : ''}</div>
          </div>
        ` : ''}
        <h2 style="border-bottom-color: #333; font-size: 15px;">
          ${format(new Date(day.date + 'T00:00:00'), 'EEEE, d MMMM yyyy')}
        </h2>
        <p style="margin-bottom: 12px; color: #666;">Day Total: <strong style="color: #1a1a2e;">${totalHrs.toFixed(1)} hours</strong></p>
        ${taskRows}

        <div class="sig-section">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Site Manager Signature</div>
            <div class="sig-label" style="margin-top: 12px;">Name: _______________________</div>
            <div class="sig-label" style="margin-top: 8px;">Date: _______________________</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Contractor Signature</div>
            <div class="sig-label" style="margin-top: 12px;">Name: _______________________</div>
            <div class="sig-label" style="margin-top: 8px;">Date: _______________________</div>
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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      ${styles}
    </head>
    <body>
      ${dayPages || '<p>No day records to display.</p>'}
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

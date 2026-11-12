import { format, parseISO } from 'date-fns';
import { CompanyProfile, CoringJobSheet, CORING_EQUIPMENT, Project } from '@/lib/types';
import { printHtml } from '@/lib/pdfReport';

const esc = (v: string | undefined) => (v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const nl = (v: string | undefined) => esc(v).replace(/\n/g, '<br/>');
const fmtDate = (d: string) => { try { return d ? format(parseISO(d), 'd/M/yyyy') : ''; } catch { return d; } };
const DAYS = ['MON', 'TUES', 'WED', 'THURS', 'FRI', 'SAT'];

function sheetHtml(s: CoringJobSheet, company: CompanyProfile) {
  let dayIdx = -1;
  try { dayIdx = (parseISO(s.date).getDay() + 6) % 7; } catch { /* */ }
  const days = DAYS.map((d, i) => `<span class="${i === dayIdx ? 'circ' : ''}">${d}</span>`).join(' ');
  const rows = [...s.cuts];
  while (rows.length < 5) rows.push({ id: '', cutId: '', qty: '', size: '', depth: '', setOut: false, wall: false, floor: false, inverted: false, excessReo: false, trayDeck: false });
  const tick = (b: boolean) => (b ? '✓' : '');
  const eq = CORING_EQUIPMENT.map(([k, l]) => `<td class="lbl">${l}</td><td class="val">${esc(s.equipment[k])}</td>`);
  const eqRows = [0, 4, 8].map(i => `<tr>${eq.slice(i, i + 4).join('')}</tr>`).join('');
  return `<section class="sheet">
  <div class="top">
    <div class="brand">${company.logo ? `<img src="${company.logo}" alt="Logo"/>` : ''}<span>${esc(company.name || 'HCG Concrete Cutters')}</span></div>
    <div class="addr"><b>${esc(company.name)}</b><br/>${nl(company.address)}<br/>${esc(company.email)}<br/>${esc(company.phone)}</div>
  </div>
  <h1>Concrete Cutting / Core Drilling Job Sheet</h1>
  <table class="grid">
    <tr><td class="w50"><span class="lbl">Company name:</span> ${esc(s.companyName)}</td><td><span class="lbl">Date:</span> ${fmtDate(s.date)} <span class="small">(Circle): ${days}</span></td></tr>
    <tr><td><span class="lbl">Site address:</span> ${esc(s.siteAddress)}</td><td><span class="lbl">Time on site:</span> ${esc(s.timeOn)} &nbsp; <span class="lbl">Time off site:</span> ${esc(s.timeOff)}</td></tr>
    <tr><td><span class="lbl">Site contact:</span> ${esc(s.siteContact)}</td><td><span class="lbl">HCG operator:</span> ${esc(s.operator)}</td></tr>
    <tr><td><span class="lbl">Contact number:</span> ${esc(s.contactNumber)}</td><td><span class="lbl">Assistant/spotter:</span> ${esc(s.assistant)}</td></tr>
  </table>
  <div class="bar">Description Of Works</div>
  <table class="grid cuts">
    <tr><th>Cut ID</th><th># No</th><th>Drill Ø/cut<br/>length(mm)</th><th>Drill/cut<br/>depth(mm)</th><th>Set out</th><th>Wall</th><th>Floor</th><th>Inverted</th><th>Excess<br/>reo</th><th>Tray deck</th></tr>
    ${rows.map(c => `<tr><td>${esc(c.cutId)}</td><td>${esc(c.qty)}</td><td>${esc(c.size)}</td><td>${esc(c.depth)}</td><td>${tick(c.setOut)}</td><td>${tick(c.wall)}</td><td>${tick(c.floor)}</td><td>${tick(c.inverted)}</td><td>${tick(c.excessReo)}</td><td>${tick(c.trayDeck)}</td></tr>`).join('')}
  </table>
  <div class="bar">Work Description/Comments</div>
  <div class="box lined" style="min-height:60px">${nl(s.workDescription)}</div>
  <div class="bar">Standby Time/Site Constraints</div>
  <div class="box lined" style="min-height:150px">${nl(s.standby)}</div>
  <div class="bar">Equipment Used/Time Allocation</div>
  <table class="grid eq">${eqRows}</table>
  <table class="grid sign">
    <tr><td class="w50"><span class="lbl">HCG operator name:</span> ${esc(s.operatorName)}</td><td><span class="lbl">Client name:</span> ${esc(s.clientName)}</td></tr>
    <tr><td><span class="lbl">Signature:</span> ${s.operatorSignature ? `<img src="${s.operatorSignature}"/>` : ''}</td><td><span class="lbl">Signature:</span> ${s.clientSignature ? `<img src="${s.clientSignature}"/>` : ''}</td></tr>
    <tr><td><span class="lbl">Date:</span> ${fmtDate(s.operatorDate)}</td><td><span class="lbl">Date:</span> ${fmtDate(s.clientDate)}</td></tr>
  </table>
  <p class="foot">The Clients representative/site contact signing this document indicates satisfaction with the works completed and confirms the requirements for the job are accurate.</p>
</section>`;
}

export function generateCoringJobSheetPdf(project: Project, company: CompanyProfile, sheets: CoringJobSheet[]) {
  const sorted = [...sheets].sort((a, b) => a.date.localeCompare(b.date));
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(project.name)} - Job Sheets</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11px; }
.sheet { page-break-after: always; break-after: page; }
.sheet:last-child { page-break-after: auto; break-after: auto; }
.top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.brand { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 800; }
.brand img { height: 52px; width: auto; }
.addr { text-align: center; font-size: 10px; line-height: 1.5; }
h1 { text-align: center; font-size: 13px; margin: 6px 0 10px; }
table.grid { width: 100%; border-collapse: collapse; }
table.grid td, table.grid th { border: 1px solid #222; padding: 4px 5px; vertical-align: top; }
table.grid th { font-weight: normal; font-size: 10px; }
.cuts td { height: 22px; text-align: center; font-weight: bold; }
.w50 { width: 50%; }
.lbl { color: #333; }
.small { font-size: 9px; }
.circ { border: 1.5px solid #111; border-radius: 50%; padding: 0 3px; font-weight: bold; }
.bar { border: 1px solid #222; border-top: 0; border-bottom: 0; text-align: center; font-weight: bold; padding: 4px; background: #f2f2f2; border-top: 1px solid #222; }
.box { border: 1px solid #222; padding: 5px 6px; font-size: 12px; line-height: 20px;
  background-image: linear-gradient(#bbb 1px, transparent 1px); background-size: 100% 20px; background-position: 0 19px; }
.eq td.lbl { width: 15%; font-size: 10px; } .eq td.val { width: 10%; text-align: center; }
.sign td { height: 26px; } .sign img { height: 40px; vertical-align: middle; }
.foot { font-size: 9px; font-style: italic; text-align: center; margin-top: 6px; }
section, table, tr { break-inside: avoid; }
</style></head><body>${sorted.map(s => sheetHtml(s, company)).join('')}</body></html>`;
  printHtml(html);
}

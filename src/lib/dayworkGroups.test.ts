import { describe, expect, it } from 'vitest';
import { groupDayworksByDate } from './dayworkGroups';
import { DayworkRecord, dayworkTotalHours } from './types';

function record(id: string, date: string, workerName: string, hours: number): DayworkRecord {
  return { id, date, siteContactName: '', siteContactPhone: '', purchaseOrder: '', tasks: [{ id: `task-${id}`, workArea: '', description: '', siteManagerId: id, siteManagerName: id, workerLogs: [{ id, workerId: id, workerName, workerRole: '', startTime: '07:00', finishTime: `${7 + hours}:00`, breakHours: 0 }] }] };
}

describe('daily job list groups', () => {
  it('shows October 27 jobs together with 31 total hours without changing original records', () => {
    const records = [record('suka', '2026-10-27', 'Dali Hou', 12), record('paul', '2026-10-27', 'Jack Liu', 19)];
    const before = JSON.stringify(records);
    const groups = groupDayworksByDate(records);
    expect(groups).toHaveLength(1);
    expect(groups[0].records.map(r => r.id)).toEqual(['suka', 'paul']);
    expect(groups[0].summary.tasks).toHaveLength(2);
    expect(dayworkTotalHours(groups[0].summary)).toBe(31);
    expect(JSON.stringify(records)).toBe(before);
  });
  it('keeps newest dates first and does not mix dates', () => {
    expect(groupDayworksByDate([record('a', '2026-10-27', 'Dali', 6), record('b', '2026-10-28', 'Dali', 6)]).map(g => g.date)).toEqual(['2026-10-28', '2026-10-27']);
  });
  it('only marks a whole date signed when every original record is signed', () => {
    const signed = { ...record('a', '2026-10-27', 'Dali', 6), signatureData: 'signature-a' };
    const pending = record('b', '2026-10-27', 'Jack', 6);
    expect(groupDayworksByDate([signed, pending])[0].summary.signatureData).toBeUndefined();
    expect(groupDayworksByDate([signed, { ...pending, signatureData: 'signature-b' }])[0].summary.signatureData).toBe('signature-a');
  });
});
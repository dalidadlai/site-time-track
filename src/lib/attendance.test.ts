import { describe, expect, it } from 'vitest';
import { attendanceDate, compareAttendance, workerIdSchema } from './attendance';
import type { DayPlan } from './types';

const plan: DayPlan = { id: 'p', projectId: 'site', date: '2026-11-02', entries: [{ workerId: 'a', workerName: 'Alice', hours: 9.5 }, { workerId: 'b', workerName: 'Bob', hours: 9.5 }] };
const record = { id: 'r', workerId: 'a', workerName: 'Alice', date: '2026-11-02', checkedInAt: '2026-11-01T18:00:00Z' };
describe('QR attendance rules', () => {
  it('compares attendance without changing planned hours', () => {
    const before = JSON.stringify(plan);
    const rows = compareAttendance(plan, [record]);
    expect(rows.map(r => [r.workerName, r.plannedHours, Boolean(r.record)])).toEqual([['Alice', 9.5, true], ['Bob', 9.5, false]]);
    expect(JSON.stringify(plan)).toBe(before);
  });
  it('includes check-ins without a saved plan or tasks', () => {
    expect(compareAttendance(undefined, [record])).toEqual([{ workerId: 'a', workerName: 'Alice', plannedHours: 0, record }]);
  });
  it('uses the Auckland day at the UTC date boundary', () => {
    expect(attendanceDate(new Date('2026-11-01T18:00:00Z'))).toBe('2026-11-02');
  });
  it('requires a predefined worker ID', () => {
    expect(workerIdSchema.safeParse('').success).toBe(false);
    expect(workerIdSchema.safeParse('a').success).toBe(true);
  });
});
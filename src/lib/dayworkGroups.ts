import { DayworkRecord } from './types';

/** Display-only date groups: never merge stored records or approvals. */
export function groupDayworksByDate(records: DayworkRecord[]) {
  const groups = new Map<string, DayworkRecord[]>();
  for (const record of records) {
    const existing = groups.get(record.date);
    if (existing) existing.push(record);
    else groups.set(record.date, [record]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, records]) => ({
      date,
      records,
      summary: {
        ...records[0],
        date,
        tasks: records.flatMap(record => record.tasks),
        signatureData: records.every(record => Boolean(record.signatureData)) ? records[0].signatureData : undefined,
      } as DayworkRecord,
    }));
}
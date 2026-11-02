import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { DayPlan } from './types';

export const tokenSchema = z.string().uuid();
export const workerIdSchema = z.string().min(1).max(100);
export const attendanceSchema = z.object({ id: z.string(), workerId: z.string(), workerName: z.string(), date: z.string(), checkedInAt: z.string() });
export type Attendance = z.infer<typeof attendanceSchema>;
export const infoSchema = z.object({ projectName: z.string(), date: z.string(), workers: z.array(z.object({ id: z.string(), name: z.string() })) });
export const receiptSchema = z.object({ workerName: z.string(), date: z.string(), checkedInAt: z.string(), alreadyCheckedIn: z.boolean() });
export const linkSchema = z.object({ token: tokenSchema, active: z.boolean() });

export function attendanceDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function attendanceTime(value: string) {
  return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
export function compareAttendance(plan: DayPlan | undefined, records: Attendance[]) {
  const entries = plan?.entries.filter(e => e.hours > 0) ?? [];
  const rows = entries.map(entry => ({ workerId: entry.workerId, workerName: entry.workerName, plannedHours: entry.hours, record: records.find(r => r.workerId === entry.workerId) }));
  records.filter(r => !entries.some(e => e.workerId === r.workerId)).forEach(record => rows.push({ workerId: record.workerId, workerName: record.workerName, plannedHours: 0, record }));
  return rows;
}
export async function getCheckinInfo(token: string) {
  const { data, error } = await supabase.rpc('attendance_checkin_info', { p_token: tokenSchema.parse(token) });
  if (error) throw error;
  return infoSchema.parse(data);
}
export async function submitCheckin(token: string, workerId: string) {
  const { data, error } = await supabase.rpc('submit_attendance_checkin', { p_token: tokenSchema.parse(token), p_worker_id: workerIdSchema.parse(workerId) });
  if (error) throw error;
  return receiptSchema.parse(data);
}
export interface CompanyProfile {
  name: string;
  address: string;
  email: string;
  phone: string;
}

export interface SiteManager {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface PredefinedWorker {
  id: string;
  name: string;
  role: string;
}

export interface WorkerLog {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: string;
  startTime: string;
  finishTime: string;
  breakHours: number;
}

export interface Task {
  id: string;
  workArea: string;
  description: string;
  siteManagerId: string;
  siteManagerName: string;
  workerLogs: WorkerLog[];
}

export interface DayworkRecord {
  id: string;
  date: string;
  siteContactName: string;
  siteContactPhone: string;
  purchaseOrder: string;
  tasks: Task[];
  signatureData?: string;
  signatureName?: string;
  signatureDate?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  siteAddress: string;
  dayworks: DayworkRecord[];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function calculateWorkerHours(log: WorkerLog): number {
  if (!log.startTime || !log.finishTime) return 0;
  const [sh, sm] = log.startTime.split(':').map(Number);
  const [fh, fm] = log.finishTime.split(':').map(Number);
  const totalMinutes = (fh * 60 + fm) - (sh * 60 + sm);
  const netHours = (totalMinutes / 60) - (log.breakHours || 0);
  return Math.max(0, Math.round(netHours * 100) / 100);
}

export function taskTotalHours(task: Task): number {
  return task.workerLogs.reduce((sum, w) => sum + calculateWorkerHours(w), 0);
}

export function dayworkTotalHours(dw: DayworkRecord): number {
  return dw.tasks.reduce((sum, t) => sum + taskTotalHours(t), 0);
}

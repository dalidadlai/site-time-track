export interface Worker {
  id: string;
  name: string;
  startTime: string; // HH:mm
  finishTime: string;
  breakMinutes: number;
}

export interface Task {
  id: string;
  description: string;
  workers: Worker[];
}

export interface DayRecord {
  id: string;
  date: string; // YYYY-MM-DD
  tasks: Task[];
  siteManagerSignature?: string;
  contractorSignature?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  days: DayRecord[];
}

export function calculateHours(worker: Worker): number {
  if (!worker.startTime || !worker.finishTime) return 0;
  const [sh, sm] = worker.startTime.split(':').map(Number);
  const [fh, fm] = worker.finishTime.split(':').map(Number);
  const totalMinutes = (fh * 60 + fm) - (sh * 60 + sm) - (worker.breakMinutes || 0);
  return Math.max(0, Math.round((totalMinutes / 60) * 100) / 100);
}

export function taskTotalHours(task: Task): number {
  return task.workers.reduce((sum, w) => sum + calculateHours(w), 0);
}

export function dayTotalHours(day: DayRecord): number {
  return day.tasks.reduce((sum, t) => sum + taskTotalHours(t), 0);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

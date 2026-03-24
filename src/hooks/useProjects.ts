import { useState, useCallback } from 'react';
import { Project, DayworkRecord, Task, WorkerLog, generateId } from '@/lib/types';
import { loadProjects, saveProjects } from '@/lib/store';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);

  const persist = useCallback((updated: Project[]) => {
    setProjects(updated);
    saveProjects(updated);
  }, []);

  const addProject = useCallback((name: string, client: string, siteAddress: string) => {
    const p: Project = { id: generateId(), name, client, siteAddress, dayworks: [] };
    persist([...projects, p]);
    return p;
  }, [projects, persist]);

  const updateProject = useCallback((id: string, updates: Partial<Omit<Project, 'id' | 'dayworks'>>) => {
    persist(projects.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [projects, persist]);

  const deleteProject = useCallback((id: string) => {
    persist(projects.filter(p => p.id !== id));
  }, [projects, persist]);

  const addDaywork = useCallback((projectId: string, data: Omit<DayworkRecord, 'id' | 'tasks'>) => {
    const dw: DayworkRecord = { ...data, id: generateId(), tasks: [] };
    persist(projects.map(p => p.id === projectId ? { ...p, dayworks: [...p.dayworks, dw] } : p));
    return dw;
  }, [projects, persist]);

  const addDayworkWithTasks = useCallback((projectId: string, dw: DayworkRecord) => {
    persist(projects.map(p => p.id === projectId ? { ...p, dayworks: [...p.dayworks, dw] } : p));
    return dw;
  }, [projects, persist]);

  const updateDaywork = useCallback((projectId: string, dayworkId: string, updates: Partial<DayworkRecord>) => {
    persist(projects.map(p => p.id === projectId ? {
      ...p, dayworks: p.dayworks.map(d => d.id === dayworkId ? { ...d, ...updates } : d)
    } : p));
  }, [projects, persist]);

  const deleteDaywork = useCallback((projectId: string, dayworkId: string) => {
    persist(projects.map(p => p.id === projectId ? { ...p, dayworks: p.dayworks.filter(d => d.id !== dayworkId) } : p));
  }, [projects, persist]);

  const addTask = useCallback((projectId: string, dayworkId: string, task: Omit<Task, 'id' | 'workerLogs'>) => {
    const t: Task = { ...task, id: generateId(), workerLogs: [] };
    persist(projects.map(p => p.id === projectId ? {
      ...p, dayworks: p.dayworks.map(d => d.id === dayworkId ? { ...d, tasks: [...d.tasks, t] } : d)
    } : p));
    return t;
  }, [projects, persist]);

  const updateTask = useCallback((projectId: string, dayworkId: string, taskId: string, updates: Partial<Omit<Task, 'id' | 'workerLogs'>>) => {
    persist(projects.map(p => p.id === projectId ? {
      ...p, dayworks: p.dayworks.map(d => d.id === dayworkId ? {
        ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      } : d)
    } : p));
  }, [projects, persist]);

  const deleteTask = useCallback((projectId: string, dayworkId: string, taskId: string) => {
    persist(projects.map(p => p.id === projectId ? {
      ...p, dayworks: p.dayworks.map(d => d.id === dayworkId ? { ...d, tasks: d.tasks.filter(t => t.id !== taskId) } : d)
    } : p));
  }, [projects, persist]);

  const addWorkerLog = useCallback((projectId: string, dayworkId: string, taskId: string, log: Omit<WorkerLog, 'id'>) => {
    const wl: WorkerLog = { ...log, id: generateId() };
    persist(projects.map(p => p.id === projectId ? {
      ...p, dayworks: p.dayworks.map(d => d.id === dayworkId ? {
        ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, workerLogs: [...t.workerLogs, wl] } : t)
      } : d)
    } : p));
  }, [projects, persist]);

  const updateWorkerLog = useCallback((projectId: string, dayworkId: string, taskId: string, logId: string, updates: Partial<WorkerLog>) => {
    persist(projects.map(p => p.id === projectId ? {
      ...p, dayworks: p.dayworks.map(d => d.id === dayworkId ? {
        ...d, tasks: d.tasks.map(t => t.id === taskId ? {
          ...t, workerLogs: t.workerLogs.map(w => w.id === logId ? { ...w, ...updates } : w)
        } : t)
      } : d)
    } : p));
  }, [projects, persist]);

  const deleteWorkerLog = useCallback((projectId: string, dayworkId: string, taskId: string, logId: string) => {
    persist(projects.map(p => p.id === projectId ? {
      ...p, dayworks: p.dayworks.map(d => d.id === dayworkId ? {
        ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, workerLogs: t.workerLogs.filter(w => w.id !== logId) } : t)
      } : d)
    } : p));
  }, [projects, persist]);

  return {
    projects, addProject, updateProject, deleteProject,
    addDaywork, addDayworkWithTasks, updateDaywork, deleteDaywork,
    addTask, updateTask, deleteTask,
    addWorkerLog, updateWorkerLog, deleteWorkerLog,
  };
}

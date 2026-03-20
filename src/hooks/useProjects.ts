import { useState, useCallback } from 'react';
import { Project, DayRecord, Task, Worker, generateId } from '@/lib/types';
import { loadProjects, saveProjects } from '@/lib/store';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);

  const persist = useCallback((updated: Project[]) => {
    setProjects(updated);
    saveProjects(updated);
  }, []);

  const addProject = useCallback((name: string, client: string, location: string) => {
    const p: Project = { id: generateId(), name, client, location, days: [] };
    persist([...projects, p]);
    return p;
  }, [projects, persist]);

  const updateProject = useCallback((id: string, updates: Partial<Pick<Project, 'name' | 'client' | 'location'>>) => {
    persist(projects.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [projects, persist]);

  const deleteProject = useCallback((id: string) => {
    persist(projects.filter(p => p.id !== id));
  }, [projects, persist]);

  const addDay = useCallback((projectId: string, date: string) => {
    const day: DayRecord = { id: generateId(), date, tasks: [] };
    persist(projects.map(p => p.id === projectId ? { ...p, days: [...p.days, day] } : p));
    return day;
  }, [projects, persist]);

  const deleteDay = useCallback((projectId: string, dayId: string) => {
    persist(projects.map(p => p.id === projectId ? { ...p, days: p.days.filter(d => d.id !== dayId) } : p));
  }, [projects, persist]);

  const addTask = useCallback((projectId: string, dayId: string, description: string) => {
    const task: Task = { id: generateId(), description, workers: [] };
    persist(projects.map(p => p.id === projectId ? {
      ...p, days: p.days.map(d => d.id === dayId ? { ...d, tasks: [...d.tasks, task] } : d)
    } : p));
    return task;
  }, [projects, persist]);

  const updateTask = useCallback((projectId: string, dayId: string, taskId: string, description: string) => {
    persist(projects.map(p => p.id === projectId ? {
      ...p, days: p.days.map(d => d.id === dayId ? {
        ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, description } : t)
      } : d)
    } : p));
  }, [projects, persist]);

  const deleteTask = useCallback((projectId: string, dayId: string, taskId: string) => {
    persist(projects.map(p => p.id === projectId ? {
      ...p, days: p.days.map(d => d.id === dayId ? { ...d, tasks: d.tasks.filter(t => t.id !== taskId) } : d)
    } : p));
  }, [projects, persist]);

  const addWorker = useCallback((projectId: string, dayId: string, taskId: string, name: string) => {
    const worker: Worker = { id: generateId(), name, startTime: '07:00', finishTime: '17:00', breakMinutes: 30 };
    persist(projects.map(p => p.id === projectId ? {
      ...p, days: p.days.map(d => d.id === dayId ? {
        ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, workers: [...t.workers, worker] } : t)
      } : d)
    } : p));
  }, [projects, persist]);

  const updateWorker = useCallback((projectId: string, dayId: string, taskId: string, workerId: string, updates: Partial<Worker>) => {
    persist(projects.map(p => p.id === projectId ? {
      ...p, days: p.days.map(d => d.id === dayId ? {
        ...d, tasks: d.tasks.map(t => t.id === taskId ? {
          ...t, workers: t.workers.map(w => w.id === workerId ? { ...w, ...updates } : w)
        } : t)
      } : d)
    } : p));
  }, [projects, persist]);

  const deleteWorker = useCallback((projectId: string, dayId: string, taskId: string, workerId: string) => {
    persist(projects.map(p => p.id === projectId ? {
      ...p, days: p.days.map(d => d.id === dayId ? {
        ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, workers: t.workers.filter(w => w.id !== workerId) } : t)
      } : d)
    } : p));
  }, [projects, persist]);

  const updateSignatures = useCallback((projectId: string, dayId: string, siteManager?: string, contractor?: string) => {
    persist(projects.map(p => p.id === projectId ? {
      ...p, days: p.days.map(d => d.id === dayId ? {
        ...d, siteManagerSignature: siteManager ?? d.siteManagerSignature, contractorSignature: contractor ?? d.contractorSignature
      } : d)
    } : p));
  }, [projects, persist]);

  return {
    projects, addProject, updateProject, deleteProject,
    addDay, deleteDay,
    addTask, updateTask, deleteTask,
    addWorker, updateWorker, deleteWorker,
    updateSignatures,
  };
}

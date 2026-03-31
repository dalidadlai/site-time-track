import { useState, useCallback } from 'react';
import { CompanyProfile, SiteManager, PredefinedWorker, TaskTemplate, generateId } from '@/lib/types';
import { loadCompany, saveCompany, loadSiteManagers, saveSiteManagers, loadWorkers, saveWorkers, loadTaskTemplates, saveTaskTemplates } from '@/lib/store';

export function useSettings() {
  const [company, setCompany] = useState<CompanyProfile>(loadCompany);
  const [siteManagers, setSiteManagers] = useState<SiteManager[]>(loadSiteManagers);
  const [workers, setWorkers] = useState<PredefinedWorker[]>(loadWorkers);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(loadTaskTemplates);

  const updateCompany = useCallback((c: CompanyProfile) => {
    setCompany(c);
    saveCompany(c);
  }, []);

  const addSiteManager = useCallback((sm: Omit<SiteManager, 'id'>) => {
    const updated = [...siteManagers, { ...sm, id: generateId() }];
    setSiteManagers(updated);
    saveSiteManagers(updated);
  }, [siteManagers]);

  const deleteSiteManager = useCallback((id: string) => {
    const updated = siteManagers.filter(s => s.id !== id);
    setSiteManagers(updated);
    saveSiteManagers(updated);
  }, [siteManagers]);

  const addWorker = useCallback((w: Omit<PredefinedWorker, 'id'>) => {
    const updated = [...workers, { ...w, id: generateId() }];
    setWorkers(updated);
    saveWorkers(updated);
  }, [workers]);

  const deleteWorker = useCallback((id: string) => {
    const updated = workers.filter(w => w.id !== id);
    setWorkers(updated);
    saveWorkers(updated);
  }, [workers]);

  const addTaskTemplate = useCallback((t: Omit<TaskTemplate, 'id' | 'usedAt'>) => {
    const updated = [...taskTemplates, { ...t, id: generateId(), usedAt: Date.now() }];
    setTaskTemplates(updated);
    saveTaskTemplates(updated);
  }, [taskTemplates]);

  const deleteTaskTemplate = useCallback((id: string) => {
    const updated = taskTemplates.filter(t => t.id !== id);
    setTaskTemplates(updated);
    saveTaskTemplates(updated);
  }, [taskTemplates]);

  const touchTaskTemplate = useCallback((id: string) => {
    const updated = taskTemplates.map(t => t.id === id ? { ...t, usedAt: Date.now() } : t);
    setTaskTemplates(updated);
    saveTaskTemplates(updated);
  }, [taskTemplates]);

  return {
    company, updateCompany,
    siteManagers, addSiteManager, deleteSiteManager,
    workers, addWorker, deleteWorker,
    taskTemplates, addTaskTemplate, deleteTaskTemplate, touchTaskTemplate,
  };
}

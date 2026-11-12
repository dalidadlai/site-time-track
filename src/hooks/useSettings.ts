import { useState, useCallback } from 'react';
import { CompanyProfile, SiteManager, PredefinedWorker, SiteInstruction, generateId } from '@/lib/types';
import { loadCompany, saveCompany, loadSiteManagers, saveSiteManagers, loadWorkers, saveWorkers, loadSiteInstructions, saveSiteInstructions } from '@/lib/store';

export function useSettings() {
  const [company, setCompany] = useState<CompanyProfile>(loadCompany);
  const [siteManagers, setSiteManagers] = useState<SiteManager[]>(loadSiteManagers);
  const [workers, setWorkers] = useState<PredefinedWorker[]>(loadWorkers);
  const [siteInstructions, setSiteInstructions] = useState<SiteInstruction[]>(loadSiteInstructions);
  const saveInstruction = useCallback((item: SiteInstruction) => {
    const updated = siteInstructions.some(i => i.id === item.id)
      ? siteInstructions.map(i => i.id === item.id ? item : i)
      : [item, ...siteInstructions];
    setSiteInstructions(updated);
    saveSiteInstructions(updated);
  }, [siteInstructions]);
  const deleteInstruction = useCallback((id: string) => {
    const updated = siteInstructions.filter(i => i.id !== id);
    setSiteInstructions(updated);
    saveSiteInstructions(updated);
  }, [siteInstructions]);

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

  return {
    siteInstructions, saveInstruction, deleteInstruction,
    company, updateCompany,
    siteManagers, addSiteManager, deleteSiteManager,
    workers, addWorker, deleteWorker,
  };
}

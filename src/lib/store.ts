import { Project, CompanyProfile, SiteManager, PredefinedWorker } from './types';

const KEYS = {
  projects: 'dw-projects',
  company: 'dw-company',
  siteManagers: 'dw-site-managers',
  workers: 'dw-workers',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const loadProjects = () => load<Project[]>(KEYS.projects, []);
export const saveProjects = (p: Project[]) => save(KEYS.projects, p);

export const loadCompany = () => load<CompanyProfile>(KEYS.company, { name: '', address: '', email: '', phone: '', logo: '' });
export const saveCompany = (c: CompanyProfile) => save(KEYS.company, c);

export const loadSiteManagers = () => load<SiteManager[]>(KEYS.siteManagers, []);
export const saveSiteManagers = (s: SiteManager[]) => save(KEYS.siteManagers, s);

export const loadWorkers = () => load<PredefinedWorker[]>(KEYS.workers, []);
export const saveWorkers = (w: PredefinedWorker[]) => save(KEYS.workers, w);

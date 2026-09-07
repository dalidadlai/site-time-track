import { supabase } from '@/integrations/supabase/client';

export const KEYS = {
  projects: 'dw-projects',
  company: 'dw-company',
  siteManagers: 'dw-site-managers',
  workers: 'dw-workers',
  plans: 'dw-plans',
};

let currentUserId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

export function setSyncUser(userId: string | null) {
  currentUserId = userId;
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** Pull cloud data down to this device, or seed the cloud with local data on first login. */
export async function pullFromCloud(userId: string): Promise<void> {
  syncing = true;
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('projects, company, site_managers, workers, plans')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // First time on this account: upload whatever is on this device.
      await supabase.from('user_data').insert({
        user_id: userId,
        projects: readLocal(KEYS.projects, []),
        company: readLocal(KEYS.company, {}),
        site_managers: readLocal(KEYS.siteManagers, []),
        workers: readLocal(KEYS.workers, []),
        plans: readLocal(KEYS.plans, []),
      });
      return;
    }

    const cloudProjects = (data.projects as unknown[]) ?? [];
    const localProjects = readLocal<unknown[]>(KEYS.projects, []);

    if (cloudProjects.length === 0 && localProjects.length > 0) {
      // Cloud is empty but this device has records: keep the device data and upload it.
      syncing = false;
      schedulePush();
      return;
    }

    localStorage.setItem(KEYS.projects, JSON.stringify(cloudProjects));
    localStorage.setItem(KEYS.company, JSON.stringify(data.company ?? {}));
    localStorage.setItem(KEYS.siteManagers, JSON.stringify(data.site_managers ?? []));
    localStorage.setItem(KEYS.workers, JSON.stringify(data.workers ?? []));
    localStorage.setItem(KEYS.plans, JSON.stringify(data.plans ?? []));
  } finally {
    syncing = false;
  }
}

async function pushNow() {
  if (!currentUserId) return;
  const payload = {
    user_id: currentUserId,
    projects: readLocal(KEYS.projects, []),
    company: readLocal(KEYS.company, {}),
    site_managers: readLocal(KEYS.siteManagers, []),
    workers: readLocal(KEYS.workers, []),
    plans: readLocal(KEYS.plans, []),
  };
  await supabase.from('user_data').upsert(payload, { onConflict: 'user_id' });
}

/** Debounced upload of the whole local dataset. */
export function schedulePush() {
  if (!currentUserId || syncing) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, 800);
}

export function clearLocalData() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

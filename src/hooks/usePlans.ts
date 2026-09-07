import { useState, useCallback } from 'react';
import { DayPlan, PlanEntry, generateId } from '@/lib/types';
import { loadPlans, savePlans } from '@/lib/store';

export function usePlans() {
  const [plans, setPlans] = useState<DayPlan[]>(loadPlans);

  // Upsert the plan for a given project + date
  const savePlan = useCallback((projectId: string, date: string, entries: PlanEntry[]) => {
    setPlans(prev => {
      const existing = prev.find(p => p.projectId === projectId && p.date === date);
      let next: DayPlan[];
      if (entries.length === 0) {
        next = prev.filter(p => p !== existing);
      } else if (existing) {
        next = prev.map(p => p === existing ? { ...p, entries } : p);
      } else {
        next = [...prev, { id: generateId(), projectId, date, entries }];
      }
      savePlans(next);
      return next;
    });
  }, []);

  const deletePlan = useCallback((projectId: string, date: string) => {
    setPlans(prev => {
      const next = prev.filter(p => !(p.projectId === projectId && p.date === date));
      savePlans(next);
      return next;
    });
  }, []);

  return { plans, savePlan, deletePlan };
}

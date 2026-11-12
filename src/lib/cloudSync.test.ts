import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KEYS, prepareLocalAccount } from './cloudSync';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
beforeEach(() => localStorage.clear());
describe('shared-device account isolation', () => {
  it('clears the previous account records before another approved account opens', () => {
    localStorage.setItem('dw-local-account', 'owner');
    localStorage.setItem(KEYS.projects, '[{"id":"private-owner-project"}]');
    prepareLocalAccount('new-user', false);
    expect(localStorage.getItem(KEYS.projects)).toBeNull();
    expect(localStorage.getItem('dw-local-account')).toBe('new-user');
  });
  it('does not import unassigned legacy owner data into a new account', () => {
    localStorage.setItem(KEYS.projects, '[{"id":"legacy-project"}]');
    prepareLocalAccount('new-user', false);
    expect(localStorage.getItem(KEYS.projects)).toBeNull();
  });
  it('preserves the owner legacy records and same-account records', () => {
    localStorage.setItem(KEYS.projects, '[{"id":"legacy-project"}]');
    prepareLocalAccount('owner', true);
    prepareLocalAccount('owner', true);
    expect(JSON.parse(localStorage.getItem(KEYS.projects) ?? '[]')).toEqual([{ id: 'legacy-project' }]);
  });
});
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccountAccess, getAccessAdmin } from './accountAccess';

const mocks = vi.hoisted(() => ({ single: vi.fn(), rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }),
  rpc: mocks.rpc,
} }));

beforeEach(() => vi.resetAllMocks());

describe('registration approval rules', () => {
  it('new accounts remain pending until owner approval', async () => {
    mocks.single.mockResolvedValue({ data: { status: 'pending' }, error: null });
    expect(await getAccountAccess('new-user')).toBe('pending');
  });
  it('only an explicitly approved account has approved status', async () => {
    mocks.single.mockResolvedValue({ data: { status: 'approved' }, error: null });
    expect(await getAccountAccess('approved-user')).toBe('approved');
  });
  it('rejected registrations remain rejected', async () => {
    mocks.single.mockResolvedValue({ data: { status: 'rejected' }, error: null });
    expect(await getAccountAccess('rejected-user')).toBe('rejected');
  });
  it('fails closed when account approval cannot be read', async () => {
    mocks.single.mockResolvedValue({ data: null, error: new Error('permission denied') });
    await expect(getAccountAccess('unknown-user')).rejects.toThrow('permission denied');
  });
  it('requires server-verified owner role for approval controls', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect(await getAccessAdmin()).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith('is_access_admin');
  });
});
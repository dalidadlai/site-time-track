import { supabase } from '@/integrations/supabase/client';

export type AccessStatus = 'pending' | 'approved' | 'rejected';

export async function getAccountAccess(userId: string) {
  const { data, error } = await supabase.from('account_access').select('status').eq('user_id', userId).single();
  if (error) throw error;
  if (!['pending', 'approved', 'rejected'].includes(data.status)) throw new Error('Unable to verify account access');
  return data.status as AccessStatus;
}

export async function getAccessAdmin() {
  const { data, error } = await supabase.rpc('is_access_admin');
  if (error) throw error;
  return data === true;
}
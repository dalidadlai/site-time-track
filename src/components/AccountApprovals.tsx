import { useEffect, useState } from 'react';
import { Check, X, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAccessAdmin } from '@/lib/accountAccess';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AccountApprovals() {
  const [admin, setAdmin] = useState(false);
  const [applications, setApplications] = useState<Tables<'account_access'>[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const isAdmin = await getAccessAdmin();
      setAdmin(isAdmin);
      if (!isAdmin) return;
      const result = await supabase.from('account_access').select('*').eq('status', 'pending').order('requested_at');
      if (result.error) throw result.error;
      setApplications(result.data);
    } catch {
      setError('Unable to load registration requests. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const review = async (userId: string, status: 'approved' | 'rejected') => {
    setBusy(true);
    const { error } = await supabase.rpc('review_account_application', { p_user_id: userId, p_status: status });
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success(status === 'approved' ? 'Account approved' : 'Registration rejected');
    await load();
  };

  if (!admin && !error) return null;
  return (
    <section className="space-y-3 border-b pb-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Registration requests</h2>
        <Button variant="ghost" size="icon" aria-label="Refresh registration requests" title="Refresh registration requests" disabled={busy} onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : applications.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests</p> : (
        <div className="divide-y">
          {applications.map(item => (
            <div key={item.user_id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{item.email}</p><p className="text-xs text-muted-foreground">{new Date(item.requested_at).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland' })}</p></div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => void review(item.user_id, 'approved')}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void review(item.user_id, 'rejected')}><X className="mr-1 h-4 w-4" /> Reject</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
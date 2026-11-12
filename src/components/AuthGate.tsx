import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { pullFromCloud, setSyncUser, prepareLocalAccount } from '@/lib/cloudSync';
import { getAccountAccess, getAccessAdmin, type AccessStatus } from '@/lib/accountAccess';
import { Button } from '@/components/ui/button';
import Auth from '@/pages/Auth';
import { Loader2 } from 'lucide-react';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const [accessError, setAccessError] = useState('');
  const [retry, setRetry] = useState(0);
  const [readyUserId, setReadyUserId] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setChecking(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user?.id ?? null;
    setSyncUser(null);
    setReady(false);
    setReadyUserId(null);
    setAccess(null);
    setAccessError('');
    if (!userId) {
      setReady(false);
      return;
    }
    let cancelled = false;
    const prepare = async () => {
      try {
        const status = await getAccountAccess(userId);
        if (cancelled) return;
        setAccess(status);
        if (status !== 'approved') return;
        const admin = await getAccessAdmin();
        if (cancelled) return;
        prepareLocalAccount(userId, admin);
        setSyncUser(userId);
        await pullFromCloud(userId);
        if (!cancelled) { setReadyUserId(userId); setReady(true); }
      } catch {
        if (!cancelled) { setSyncUser(null); setAccessError('Unable to verify access or sync your records. Please try again.'); }
      }
    };
    void prepare();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, retry]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <Auth />;

  if (accessError || access === 'pending' || access === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-bold">{accessError ? 'Access unavailable' : access === 'pending' ? 'Awaiting owner approval' : 'Registration not approved'}</h1>
          <p className="text-sm text-muted-foreground">{accessError || (access === 'pending' ? 'Your registration has been submitted. The owner must approve your account before you can use Daywork Tracker.' : 'The owner has declined this registration request.')}</p>
          <Button className="w-full" onClick={() => setRetry(value => value + 1)}>Check again</Button>
          <Button variant="outline" className="w-full" onClick={() => void supabase.auth.signOut()}>Sign out</Button>
        </div>
      </div>
    );
  }

  if (!ready || readyUserId !== session.user.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Syncing your data…</p>
      </div>
    );
  }

  // key forces a fresh mount (hooks re-read localStorage) after the cloud pull
  return <React.Fragment key={session.user.id}>{children}</React.Fragment>;
}

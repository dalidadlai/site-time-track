import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { pullFromCloud, setSyncUser } from '@/lib/cloudSync';
import Auth from '@/pages/Auth';
import { Loader2 } from 'lucide-react';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);

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
    setSyncUser(userId);
    if (!userId) {
      setReady(false);
      return;
    }
    let cancelled = false;
    pullFromCloud(userId)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <Auth />;

  if (!ready) {
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

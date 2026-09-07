import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { HardHat, Loader2 } from 'lucide-react';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success('Account created. Check your email if confirmation is required.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <HardHat className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Daywork Tracker</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin' ? 'Sign in to sync your records across devices' : 'Create an account to sync your records'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email" type="email" inputMode="email" autoComplete="email" required
              className="h-12" value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password" type="password" required minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="h-12" value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <button
          type="button"
          className="w-full text-sm text-muted-foreground underline underline-offset-4 py-2"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}

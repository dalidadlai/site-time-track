import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ImproveWithAIProps {
  value: string;
  onChange: (next: string) => void;
}

export function ImproveWithAI({ value, onChange }: ImproveWithAIProps) {
  const [loading, setLoading] = useState(false);

  const handleImprove = async () => {
    const text = value.trim();
    if (!text) {
      toast({ title: 'Type something first', description: 'Add a rough description, then tap Improve with AI.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-description', { body: { text } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const improved = (data?.improved ?? '').toString().trim();
      if (!improved) throw new Error('No content returned');
      onChange(improved);
      toast({ title: '✨ Improved', description: 'Description rewritten by AI.' });
    } catch (e) {
      toast({
        title: 'AI improvement failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleImprove}
      disabled={loading}
      className="h-7 px-2 text-xs gap-1"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {loading ? 'Improving…' : 'Improve with AI'}
    </Button>
  );
}
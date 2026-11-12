import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { instructionSnapshot } from '@/lib/siteInstructions';
import type { SiteInstruction } from '@/lib/types';
import { toast } from 'sonner';

export default function DayworkSI({ items, saved, onSave }: {
  items: SiteInstruction[];
  saved?: SiteInstruction;
  onSave: (item: SiteInstruction | undefined) => void;
}) {
  const [selected, setSelected] = useState(saved?.id ?? 'none');
  const [changed, setChanged] = useState(false);
  const choices = saved && !items.some(i => i.id === saved.id) ? [saved, ...items] : items;
  const preview = changed ? choices.find(i => i.id === selected) : saved;
  return <section className="space-y-2 border-t border-b py-4">
    <Label htmlFor="daywork-si">SI / Site Instruction</Label>
    <Select value={changed ? selected : (saved?.id ?? 'none')} onValueChange={value => { setSelected(value); setChanged(true); }}>
      <SelectTrigger id="daywork-si" className="min-h-11"><SelectValue placeholder="Select SI" /></SelectTrigger>
      <SelectContent className="max-w-[calc(100vw-2rem)]"><SelectItem value="none">No SI</SelectItem>{choices.map(item => <SelectItem key={item.id} value={item.id}><span className="break-words">{item.number} · {item.sender}</span></SelectItem>)}</SelectContent>
    </Select>
    {preview && <div className="space-y-1"><p className="text-sm text-muted-foreground break-words">From: {preview.sender}</p><p className="text-sm whitespace-pre-wrap break-words">{preview.content}</p></div>}
    {changed && <div className="flex gap-2"><Button size="sm" onClick={() => { onSave(preview ? instructionSnapshot(preview) : undefined); setChanged(false); toast.success('Daywork SI saved'); }}>Save SI</Button><Button size="sm" variant="outline" onClick={() => { setSelected(saved?.id ?? 'none'); setChanged(false); }}>Cancel</Button></div>}
  </section>;
}
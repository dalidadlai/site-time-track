import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { instructionSnapshot } from '@/lib/siteInstructions';
import type { SiteInstruction } from '@/lib/types';

export default function TaskSI({ items, value, onChange, id }: {
  items: SiteInstruction[];
  value?: SiteInstruction;
  onChange: (item: SiteInstruction | undefined) => void;
  id: string;
}) {
  const choices = value && !items.some(item => item.id === value.id) ? [value, ...items] : items;
  return <div className="space-y-2">
    <Label htmlFor={id}>SI / Site Instruction</Label>
    <Select value={value?.id ?? 'none'} onValueChange={selected => {
      const instruction = choices.find(item => item.id === selected);
      onChange(instruction ? instructionSnapshot(instruction) : undefined);
    }}>
      <SelectTrigger id={id} className="min-h-11"><SelectValue placeholder="Select SI" /></SelectTrigger>
      <SelectContent className="max-w-[calc(100vw-2rem)]"><SelectItem value="none">No SI</SelectItem>{choices.map(item => <SelectItem key={item.id} value={item.id}><span className="break-words">{item.number} · {item.sender}</span></SelectItem>)}</SelectContent>
    </Select>
    {value && <div className="space-y-1"><p className="text-sm text-muted-foreground break-words">From: {value.sender}</p><p className="text-sm whitespace-pre-wrap break-words">{value.content}</p></div>}
  </div>;
}
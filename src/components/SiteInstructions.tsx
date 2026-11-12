import { useState } from 'react';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { generateId, type SiteInstruction } from '@/lib/types';
import { toast } from 'sonner';

export default function SiteInstructions({ items, onSave, onDelete }: {
  items: SiteInstruction[];
  onSave: (item: SiteInstruction) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<SiteInstruction>();
  const [deleting, setDeleting] = useState<SiteInstruction>();
  return <section className="space-y-3 border-t pt-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-semibold"><FileText className="w-5 h-5 text-primary" />SI / Site Instructions</h2>
      <Button variant="outline" size="sm" onClick={() => setDraft({ id: generateId(), sender: '', number: '', content: '' })}><Plus className="w-4 h-4 mr-1" />Add SI</Button>
    </div>
    <div className="divide-y">{items.map(item => <div key={item.id} className="flex gap-2 py-3">
      <div className="min-w-0 flex-1"><p className="font-medium break-words">SI {item.number}</p><p className="text-sm text-muted-foreground break-words">From: {item.sender}</p><p className="text-sm whitespace-pre-wrap break-words mt-1">{item.content}</p></div>
      <Button variant="ghost" size="icon" aria-label={`Edit SI ${item.number}`} onClick={() => setDraft({ ...item })}><Pencil className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" aria-label={`Delete SI ${item.number}`} onClick={() => setDeleting(item)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
    </div>)}</div>
    <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open) setDraft(undefined); }}><DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{items.some(i => i.id === draft?.id) ? 'Edit SI' : 'Add SI'}</DialogTitle></DialogHeader>
      {draft && <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (!draft.sender.trim() || !draft.number.trim() || !draft.content.trim()) return; onSave({ ...draft, sender: draft.sender.trim(), number: draft.number.trim(), content: draft.content.trim() }); setDraft(undefined); toast.success('SI saved'); }}>
        <div><Label htmlFor="si-sender">SI From *</Label><Input id="si-sender" required value={draft.sender} onChange={e => setDraft({ ...draft, sender: e.target.value })} /></div>
        <div><Label htmlFor="si-number">SI Number *</Label><Input id="si-number" required value={draft.number} onChange={e => setDraft({ ...draft, number: e.target.value })} /></div>
        <div><Label htmlFor="si-content">SI Content *</Label><Textarea id="si-content" required rows={5} value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} /></div>
        <Button type="submit" className="w-full" disabled={!draft.sender.trim() || !draft.number.trim() || !draft.content.trim()}>Save SI</Button>
      </form>}
    </DialogContent></Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={open => { if (!open) setDeleting(undefined); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete SI {deleting?.number}?</AlertDialogTitle><AlertDialogDescription>Remove this SI from the saved list? Existing Daywork records will keep their saved SI details.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleting) onDelete(deleting.id); setDeleting(undefined); toast.success('SI deleted'); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Plus, Trash2, FileText, Pencil, Users, X, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import SignaturePad from './SignaturePad';
import { toast } from '@/hooks/use-toast';
import { CompanyProfile, CoringCut, CoringJobSheet, CORING_EQUIPMENT, Project, generateId } from '@/lib/types';
import { generateCoringJobSheetPdf } from '@/lib/coringPdf';

interface Props {
  project: Project;
  company: CompanyProfile;
  onUpdateStaff: (staff: string[]) => void;
  onSave: (sheet: CoringJobSheet) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const today = () => format(new Date(), 'yyyy-MM-dd');
const emptyCut = (type: 'drill' | 'cut' = 'drill'): CoringCut => ({ id: generateId(), type, cutId: type === 'drill' ? 'CD' : 'CC', qty: '', size: '', depth: '', setOut: false, wall: false, floor: false, inverted: false, excessReo: false, trayDeck: false });
const TIMES = Array.from({ length: 31 }, (_, i) => `${String(5 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
const DRILL_SIZES = ['32mm', '42mm', '52mm', '65mm', '82mm', '102mm', '112mm', '127mm', '152mm', '162mm', '202mm', '250mm', '300mm'];
const CUT_FLAGS = [['setOut', 'Set out'], ['wall', 'Wall'], ['floor', 'Floor'], ['inverted', 'Inverted'], ['excessReo', 'Excess reo'], ['trayDeck', 'Tray deck']] as const;

function blankSheet(project: Project): CoringJobSheet {
  return {
    id: generateId(), date: today(), timeOn: '', timeOff: '', companyName: project.client, siteAddress: project.siteAddress,
    siteContact: '', contactNumber: '', operator: '', assistant: '', cuts: [], workDescription: '', standby: '',
    equipment: {}, operatorName: '', operatorDate: today(), clientName: '', clientDate: today(),
  };
}

const fmt = (d: string) => { try { return format(parseISO(d), 'EEE d MMM yyyy'); } catch { return d; } };

export default function CoringProjectDetail({ project, company, onUpdateStaff, onSave, onDelete, onBack }: Props) {
  const sheets = useMemo(() => [...(project.jobSheets ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [project.jobSheets]);
  const staff = company.coringStaff ?? [];
  const [form, setForm] = useState<CoringJobSheet | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [signing, setSigning] = useState<'operator' | 'client' | null>(null);

  const set = <K extends keyof CoringJobSheet>(k: K, v: CoringJobSheet[K]) => setForm(f => (f ? { ...f, [k]: v } : f));
  const setCut = (id: string, patch: Partial<CoringCut>) => setForm(f => (f ? { ...f, cuts: f.cuts.map(c => (c.id === id ? { ...c, ...patch } : c)) } : f));

  const save = () => {
    if (!form) return;
    if (!form.date) { toast({ title: 'Please choose a date' }); return; }
    onSave({ ...form, siteAddress: project.siteAddress, cuts: form.cuts.filter(c => c.qty || c.size || c.depth || CUT_FLAGS.some(([k]) => c[k])) });
    setForm(null);
    toast({ title: '✓ Job sheet saved' });
  };

  const pdf = (ids: string[]) => {
    const list = sheets.filter(s => ids.includes(s.id));
    if (!list.length) { toast({ title: 'Select at least one job sheet' }); return; }
    generateCoringJobSheetPdf(project, company, list);
  };

  const TimePick = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="mt-1"><SelectValue placeholder="--:--" /></SelectTrigger>
      <SelectContent className="max-h-72">{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
    </Select>
  );

  const StaffPick = ({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) => (
    <>
      <Input list={id} value={value} onChange={e => onChange(e.target.value)} className="mt-1" placeholder="Name" />
      <datalist id={id}>{staff.map(s => <option key={s} value={s} />)}</datalist>
      {staff.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {staff.map(s => (
            <button key={s} type="button" onClick={() => onChange(s)}
              className={`rounded-full border px-3 py-1 text-xs ${value === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}>{s}</button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen pb-28">
      <header className="px-4 pb-4 sticky top-0 bg-background z-10 border-b" style={{ paddingTop: 'max(env(safe-area-inset-top), 1.25rem)' }}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{project.name}</h1>
            <p className="text-xs text-muted-foreground truncate">Core Drilling & Concrete Cutting · {project.client}</p>
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setStaffOpen(true)} aria-label="Operators list"><Users className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {sheets.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.length === sheets.length} onCheckedChange={v => setSelected(v ? sheets.map(s => s.id) : [])} /> Select all
            </label>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={!selected.length} onClick={() => pdf(selected)}>
              <FileText className="w-4 h-4" /> PDF ({selected.length})
            </Button>
          </div>
        )}
        {sheets.length === 0 && <p className="text-center text-muted-foreground py-16">No job sheets yet</p>}
        {sheets.map(s => (
          <div key={s.id} className="bg-card border rounded-lg p-3 flex items-start gap-3">
            <Checkbox className="mt-1" checked={selected.includes(s.id)} onCheckedChange={v => setSelected(x => (v ? [...x, s.id] : x.filter(i => i !== s.id)))} />
            <button className="flex-1 min-w-0 text-left" onClick={() => setForm(structuredClone(s))}>
              <p className="font-semibold">{fmt(s.date)}</p>
              <p className="text-sm text-muted-foreground">{[s.timeOn && s.timeOff ? `${s.timeOn}–${s.timeOff}` : '', s.operator, s.assistant].filter(Boolean).join(' · ')}</p>
              {s.workDescription && <p className="text-sm mt-1 line-clamp-2 whitespace-pre-line">{s.workDescription}</p>}
              <p className="text-xs mt-1">
                <span className={s.clientSignature ? 'text-primary font-medium' : 'text-muted-foreground'}>{s.clientSignature ? 'Client signed' : 'Client signature pending'}</span>
              </p>
            </button>
            <div className="flex flex-col">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setForm(structuredClone(s))}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => pdf([s.id])}><FileText className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-6 right-4 left-4 flex justify-end">
        <Button size="lg" className="rounded-full shadow-lg gap-2 px-6" onClick={() => setForm(blankSheet(project))}><Plus className="w-5 h-5" /> New Job Sheet</Button>
      </div>

      {/* Editor */}
      <Dialog open={!!form} onOpenChange={v => !v && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4">
          <DialogHeader><DialogTitle>Core Drilling / Cutting Job Sheet</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="mt-1" /></div>
                <div><Label>Time on</Label><TimePick value={form.timeOn} onChange={v => set('timeOn', v)} /></div>
                <div><Label>Time off</Label><TimePick value={form.timeOff} onChange={v => set('timeOff', v)} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Company name</Label><Input value={form.companyName} onChange={e => set('companyName', e.target.value)} className="mt-1" /></div>
                <div><Label>Site manager</Label><Input value={form.siteManager ?? ''} onChange={e => set('siteManager', e.target.value)} className="mt-1" /></div>
                <div className="sm:col-span-2"><Label>Location</Label><Input value={form.location ?? ''} onChange={e => set('location', e.target.value)} className="mt-1" placeholder="e.g. Level 1, pier wall" /></div>
                <div><Label>HCG operator</Label><StaffPick id="op" value={form.operator} onChange={v => setForm(f => f && ({ ...f, operator: v, operatorName: f.operatorName || v }))} /></div>
                <div><Label>Assistant / spotter</Label><StaffPick id="as" value={form.assistant} onChange={v => set('assistant', v)} /></div>
              </div>

              <div>
                <Label className="text-base">Description of works</Label>
                <div className="space-y-2 mt-2">
                  {form.cuts.length === 0 && <p className="text-sm text-muted-foreground">No items yet — add a core drill or concrete cutting.</p>}
                  {form.cuts.map((c, i) => {
                    const drill = (c.type ?? 'drill') === 'drill';
                    const custom = drill && c.size !== '' && !DRILL_SIZES.includes(c.size);
                    return (
                    <div key={c.id} className="border rounded-md p-2 space-y-2">
                      <div className="flex items-center justify-between"><span className="text-sm font-semibold">{i + 1}. {drill ? 'Core drill' : 'Concrete cutting'}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => set('cuts', form.cuts.filter(x => x.id !== c.id))}><X className="w-4 h-4" /></Button></div>
                      {drill && (
                        <div>
                          <Label className="text-xs">Hole size (Ø)</Label>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {DRILL_SIZES.map(sz => (
                              <button key={sz} type="button" onClick={() => setCut(c.id, { size: sz })}
                                className={`rounded-full border px-3 py-1.5 text-xs ${c.size === sz ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}>{sz}</button>
                            ))}
                          </div>
                          <Input className="mt-1.5 h-9" value={custom ? c.size : ''} onChange={e => setCut(c.id, { size: e.target.value })} placeholder="Other size, e.g. 75mm" />
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <div><Label className="text-xs">Qty</Label><Input inputMode="numeric" value={c.qty} onChange={e => setCut(c.id, { qty: e.target.value })} /></div>
                        {!drill && <div><Label className="text-xs">Cut length</Label><Input value={c.size} onChange={e => setCut(c.id, { size: e.target.value })} placeholder="1200mm" /></div>}
                        <div><Label className="text-xs">Depth</Label><Input value={c.depth} onChange={e => setCut(c.id, { depth: e.target.value })} placeholder="150mm" /></div>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium min-h-[40px] rounded-md bg-secondary px-2">
                        <Checkbox checked={c.excessReo} onCheckedChange={v => setCut(c.id, { excessReo: !!v })} />More than one layer of reo (excess reo)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {CUT_FLAGS.filter(([k]) => k !== 'excessReo').map(([k, l]) => (
                          <label key={k} className="flex items-center gap-2 text-sm min-h-[36px]"><Checkbox checked={c[k]} onCheckedChange={v => setCut(c.id, { [k]: !!v })} />{l}</label>
                        ))}
                      </div>
                    </div>
                  );})}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="gap-1" onClick={() => set('cuts', [...form.cuts, emptyCut('drill')])}><Plus className="w-4 h-4" /> Core drill</Button>
                    <Button variant="outline" className="gap-1" onClick={() => set('cuts', [...form.cuts, emptyCut('cut')])}><Plus className="w-4 h-4" /> Concrete cutting</Button>
                  </div>
                </div>
              </div>

              <div><Label>Work description / comments</Label><Textarea rows={3} value={form.workDescription} onChange={e => set('workDescription', e.target.value)} className="mt-1" /></div>
              <div><Label>Standby time / site constraints</Label><Textarea rows={6} value={form.standby} onChange={e => set('standby', e.target.value)} className="mt-1" placeholder={'Travel time: 1.5 hrs\nPre-start: 30 mins'} /></div>

              <div>
                <Label className="text-base">Equipment used / time allocation</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CORING_EQUIPMENT.map(([k, l]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-sm flex-1">{l}</span>
                      <Input className="w-20 h-9" value={form.equipment[k] ?? ''} onChange={e => set('equipment', { ...form.equipment, [k]: e.target.value })} placeholder="✓ / hrs" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {(['operator', 'client'] as const).map(who => {
                  const nameK = who === 'operator' ? 'operatorName' : 'clientName';
                  const sigK = who === 'operator' ? 'operatorSignature' : 'clientSignature';
                  const dateK = who === 'operator' ? 'operatorDate' : 'clientDate';
                  return (
                    <div key={who} className="border rounded-md p-3 space-y-2">
                      <p className="font-semibold text-sm">{who === 'operator' ? 'HCG operator sign-off' : 'Client sign-off'}</p>
                      <div><Label className="text-xs">Name</Label><Input value={form[nameK]} onChange={e => set(nameK, e.target.value)} /></div>
                      {form[sigK]
                        ? <div className="flex items-center gap-2"><img src={form[sigK]} alt="Signature" className="h-14 bg-card border rounded" />
                            <Button variant="ghost" size="sm" onClick={() => set(sigK, undefined)}>Clear</Button></div>
                        : <Button variant="outline" className="w-full gap-2" onClick={() => setSigning(who)}><PenLine className="w-4 h-4" /> Sign</Button>}
                      <div><Label className="text-xs">Date</Label><Input type="date" value={form[dateK]} onChange={e => set(dateK, e.target.value)} /></div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 sticky bottom-0 bg-background pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setForm(null)}>Cancel</Button>
                <Button className="flex-1" onClick={save}>Save Job Sheet</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!signing} onOpenChange={v => !v && setSigning(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{signing === 'client' ? 'Client signature' : 'Operator signature'}</DialogTitle></DialogHeader>
          <SignaturePad onSave={d => { set(signing === 'client' ? 'clientSignature' : 'operatorSignature', d); setSigning(null); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Operators / assistants list</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input value={newStaff} onChange={e => setNewStaff(e.target.value)} placeholder="Name" />
            <Button onClick={() => { const n = newStaff.trim(); if (n && !staff.includes(n)) onUpdateStaff([...staff, n]); setNewStaff(''); }}>Add</Button>
          </div>
          <div className="space-y-1">
            {staff.length === 0 && <p className="text-sm text-muted-foreground">No names yet</p>}
            {staff.map(s => (
              <div key={s} className="flex items-center justify-between border rounded-md px-3 py-1.5">
                <span>{s}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm(`Remove ${s}?`)) onUpdateStaff(staff.filter(x => x !== s)); }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete job sheet?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { onDelete(deleteId); setSelected(x => x.filter(i => i !== deleteId)); setDeleteId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

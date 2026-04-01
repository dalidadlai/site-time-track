import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Calendar as CalendarIcon, Clock, ChevronRight, Trash2, FileText, Pencil, Copy, CalendarDays, UserPlus, X } from 'lucide-react';
import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Project, DayworkRecord, SiteManager, PredefinedWorker, dayworkTotalHours, generateId } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface ProjectDetailProps {
  project: Project;
  siteManagers: SiteManager[];
  workers: PredefinedWorker[];
  onBack: () => void;
  onSelectDaywork: (id: string) => void;
  onAddDaywork: (data: { date: string; siteContactName: string; siteContactPhone: string; purchaseOrder: string }) => void;
  onAddDayworkWithTasks: (data: DayworkRecord) => void;
  onEditDaywork: (id: string, data: Partial<DayworkRecord>) => void;
  onDeleteDaywork: (id: string) => void;
  onGeneratePdf: (dayworkIds: string[]) => void;
  onNavigateToDaywork?: (dayworkId: string) => void;
}

interface MultiDayWorker {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: string;
  totalHours: number;
}

interface MultiDayTask {
  id: string;
  workArea: string;
  description: string;
  siteManagerId: string;
  siteManagerName: string;
  workers: MultiDayWorker[];
}

export default function ProjectDetail({ project, onBack, onSelectDaywork, onAddDaywork, onAddDayworkWithTasks, onEditDaywork, onDeleteDaywork, onGeneratePdf, siteManagers, workers }: ProjectDetailProps) {
  const [open, setOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [po, setPo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPo, setEditPo] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Copy from previous state
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyDate, setCopyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [copySourceId, setCopySourceId] = useState('');

  // Multi-day task creation state
  const [multiTasks, setMultiTasks] = useState<MultiDayTask[]>([]);
  const [mtWorkArea, setMtWorkArea] = useState('');
  const [mtDesc, setMtDesc] = useState('');
  const [mtSmId, setMtSmId] = useState('');
  const [mtWorkerOpen, setMtWorkerOpen] = useState<string | null>(null);
  const [mtSelectedWorkerId, setMtSelectedWorkerId] = useState('');

  const sortedDays = [...project.dayworks].sort((a, b) => b.date.localeCompare(a.date));
  const isMultiDay = selectedDates.length > 1;

  const handleAddMultiDayTask = () => {
    if (!mtDesc.trim()) return;
    const sm = siteManagers.find(s => s.id === mtSmId);
    const newTask: MultiDayTask = {
      id: generateId(),
      workArea: mtWorkArea.trim(),
      description: mtDesc.trim(),
      siteManagerId: mtSmId,
      siteManagerName: sm?.name || '',
      workers: [],
    };
    setMultiTasks(prev => [...prev, newTask]);
    setMtWorkArea(''); setMtDesc(''); setMtSmId('');
  };

  const addWorkerToMultiTask = (taskId: string) => {
    const w = workers.find(pw => pw.id === mtSelectedWorkerId);
    if (!w) return;
    setMultiTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      workers: [...t.workers, { id: generateId(), workerId: w.id, workerName: w.name, workerRole: w.role, totalHours: 8 }]
    } : t));
    setMtSelectedWorkerId(''); setMtWorkerOpen(null);
  };

  const removeMultiTask = (taskId: string) => {
    setMultiTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const updateMultiWorkerHours = (taskId: string, workerId: string, hours: number) => {
    setMultiTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      workers: t.workers.map(w => w.id === workerId ? { ...w, totalHours: hours } : w)
    } : t));
  };

  const removeMultiWorker = (taskId: string, workerId: string) => {
    setMultiTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      workers: t.workers.filter(w => w.id !== workerId)
    } : t));
  };

  const handleAdd = () => {
    if (selectedDates.length === 0) return;

    if (isMultiDay && multiTasks.length > 0) {
      // Create dayworks with tasks and Total Hours mapped to worker logs
      selectedDates.forEach(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const dw: DayworkRecord = {
          id: generateId(),
          date: dateStr,
          siteContactName: contactName.trim(),
          siteContactPhone: contactPhone.trim(),
          purchaseOrder: po.trim(),
          tasks: multiTasks.map(mt => ({
            id: generateId(),
            workArea: mt.workArea,
            description: mt.description,
            siteManagerId: mt.siteManagerId,
            siteManagerName: mt.siteManagerName,
            workerLogs: mt.workers.map(w => {
              // Map total hours to start/finish with 0 break
              const startHour = 7;
              const endMinutes = startHour * 60 + Math.round(w.totalHours * 60);
              const fh = Math.floor(endMinutes / 60);
              const fm = endMinutes % 60;
              return {
                id: generateId(),
                workerId: w.workerId,
                workerName: w.workerName,
                workerRole: w.workerRole,
                startTime: '07:00',
                finishTime: `${String(fh).padStart(2, '0')}:${String(fm).padStart(2, '0')}`,
                breakHours: 0,
              };
            }),
          })),
        };
        onAddDayworkWithTasks(dw);
      });
      toast({ title: `✓ Created ${selectedDates.length} dayworks with ${multiTasks.length} task${multiTasks.length > 1 ? 's' : ''}` });
    } else {
      selectedDates.forEach(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        onAddDaywork({ date: dateStr, siteContactName: contactName.trim(), siteContactPhone: contactPhone.trim(), purchaseOrder: po.trim() });
      });
      if (selectedDates.length > 1) {
        toast({ title: `✓ Created ${selectedDates.length} daywork records` });
      }
    }
    setOpen(false); setContactName(''); setContactPhone(''); setPo('');
    setSelectedDates([new Date()]); setMultiTasks([]);
  };

  const handleCopy = () => {
    if (!copyDate || !copySourceId) return;
    const source = project.dayworks.find(d => d.id === copySourceId);
    if (!source) return;

    const newDw: DayworkRecord = {
      id: generateId(),
      date: copyDate,
      siteContactName: source.siteContactName,
      siteContactPhone: source.siteContactPhone,
      purchaseOrder: source.purchaseOrder,
      tasks: source.tasks.map(t => ({
        ...t,
        id: generateId(),
        workerLogs: t.workerLogs.map(w => ({
          ...w,
          id: generateId(),
          startTime: '',
          finishTime: '',
          breakHours: 0.5,
        })),
      })),
    };

    onAddDayworkWithTasks(newDw);
    setCopyOpen(false);
    toast({ title: `✓ Copied ${newDw.tasks.length} tasks from ${format(new Date(source.date + 'T00:00:00'), 'd MMM')}` });
  };

  const openCopyDialog = () => {
    setOpen(false);
    setCopyDate(format(new Date(), 'yyyy-MM-dd'));
    setCopySourceId(sortedDays.length > 0 ? sortedDays[0].id : '');
    setCopyOpen(true);
  };

  const openEditDaywork = (dw: DayworkRecord) => {
    setEditId(dw.id);
    setEditDate(dw.date);
    setEditContact(dw.siteContactName);
    setEditPhone(dw.siteContactPhone);
    setEditPo(dw.purchaseOrder);
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editDate) return;
    onEditDaywork(editId, { date: editDate, siteContactName: editContact.trim(), siteContactPhone: editPhone.trim(), purchaseOrder: editPo.trim() });
    setEditOpen(false);
    toast({ title: '✓ Daywork updated' });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleMultiPdf = () => {
    if (selectedIds.size === 0) return;
    onGeneratePdf(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 active-scale">
          <ArrowLeft className="w-4 h-4" /> Projects
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{project.client}{project.siteAddress ? ` · ${project.siteAddress}` : ''}</p>
          </div>
          {sortedDays.length > 0 && (
            <Button
              variant={selectMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (selectMode && selectedIds.size > 0) {
                  handleMultiPdf();
                } else {
                  setSelectMode(!selectMode);
                  setSelectedIds(new Set());
                }
              }}
              className="gap-1.5 active-scale"
            >
              <FileText className="w-4 h-4" />
              {selectMode ? (selectedIds.size > 0 ? `PDF (${selectedIds.size})` : 'Cancel') : 'Multi PDF'}
            </Button>
          )}
        </div>
      </header>

      <div className="px-4 space-y-3">
        {sortedDays.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <CalendarIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No daywork records</p>
            <p className="text-sm text-muted-foreground mt-1">Add a daily record to start tracking</p>
          </div>
        )}

        {sortedDays.map((dw, i) => {
          const totalHrs = dayworkTotalHours(dw);
          return (
            <div key={dw.id} className="bg-card rounded-lg shadow-sm border p-4 active-scale cursor-pointer animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => selectMode ? toggleSelect(dw.id) : onSelectDaywork(dw.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectMode && (
                    <Checkbox checked={selectedIds.has(dw.id)} onCheckedChange={() => toggleSelect(dw.id)}
                      onClick={e => e.stopPropagation()} className="h-5 w-5" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold">{format(new Date(dw.date + 'T00:00:00'), 'EEE, d MMM yyyy')}</h3>
                    {(() => {
                      const managers = [...new Set(dw.tasks.map(t => t.siteManagerName).filter(Boolean))];
                      if (managers.length > 0) {
                        return (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {managers[0]}{managers.length > 1 ? ` +${managers.length - 1}` : ''}
                          </p>
                        );
                      }
                      return null;
                    })()}
                    <div className="flex gap-4 mt-1.5">
                      <span className="text-sm text-muted-foreground">{dw.tasks.length} task{dw.tasks.length !== 1 ? 's' : ''}</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {totalHrs.toFixed(1)}h
                      </span>
                    </div>
                    {dw.siteContactName && <p className="text-xs text-muted-foreground mt-1">Contact: {dw.siteContactName}</p>}
                    <div className="mt-1.5">
                      {dw.signatureData ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-[10px] px-2 py-0">Signed</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-[10px] px-2 py-0">Pending</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!selectMode && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); openEditDaywork(dw); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); onGeneratePdf([dw.id]); }}>
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(dw.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* This Week PDF button */}
      {sortedDays.length > 0 && !selectMode && (
        <div className="px-4 mt-4">
          <Button variant="outline" className="w-full gap-2" onClick={() => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            const monStr = format(monday, 'yyyy-MM-dd');
            const sunStr = format(sunday, 'yyyy-MM-dd');
            const weekIds = sortedDays.filter(dw => dw.date >= monStr && dw.date <= sunStr).map(dw => dw.id);
            if (weekIds.length === 0) {
              toast({ title: 'No dayworks found this week' });
              return;
            }
            onGeneratePdf(weekIds);
          }}>
            <CalendarDays className="w-4 h-4" /> Generate This Week PDF
          </Button>
        </div>
      )}

      {/* Add Daywork FAB */}
      <div className="fixed bottom-6 right-4 left-4 flex justify-end gap-2">
        {sortedDays.length > 0 && (
          <Button size="lg" variant="outline" className="rounded-full shadow-lg active-scale gap-2 px-5 bg-card"
            onClick={openCopyDialog}>
            <Copy className="w-5 h-5" /> Copy Previous
          </Button>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg active-scale gap-2 px-6">
              <Plus className="w-5 h-5" /> New Blank
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Daywork Record</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Select Dates *</Label>
                <p className="text-xs text-muted-foreground mb-2">Tap multiple dates to create dayworks for each</p>
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  className="rounded-md border mx-auto pointer-events-auto"
                />
                {selectedDates.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
              <div><Label>Site Contact Name</Label><Input value={contactName} onChange={e => setContactName(e.target.value)} className="mt-1" /></div>
              <div><Label>Contact Phone</Label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="mt-1" /></div>
              <div><Label>PO / Contract Ref</Label><Input value={po} onChange={e => setPo(e.target.value)} className="mt-1" /></div>

              {/* Multi-day: add tasks with Total Hours */}
              {isMultiDay && (
                <div className="border-t pt-3 space-y-3">
                  <Label className="text-base font-semibold">Tasks (optional)</Label>
                  <p className="text-xs text-muted-foreground">Add tasks with workers — only Total Hours needed for multi-day.</p>

                  {/* Existing multi-day tasks */}
                  {multiTasks.map(mt => (
                    <div key={mt.id} className="bg-secondary/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          {mt.workArea && <span className="text-xs font-medium text-muted-foreground">{mt.workArea}</span>}
                          <p className="font-medium text-sm whitespace-pre-line">{mt.description}</p>
                          {mt.siteManagerName && <p className="text-xs text-muted-foreground">SM: {mt.siteManagerName}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMultiTask(mt.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Workers with Total Hours */}
                      {mt.workers.map(w => (
                        <div key={w.id} className="flex items-center gap-2 bg-background rounded p-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{w.workerName}</span>
                            {w.workerRole && <span className="text-xs text-muted-foreground ml-1">({w.workerRole})</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Input type="number" step="0.5" min={0} max={24} value={w.totalHours}
                              onChange={e => updateMultiWorkerHours(mt.id, w.id, parseFloat(e.target.value) || 0)}
                              className="w-16 h-8 text-sm text-center" />
                            <span className="text-xs text-muted-foreground">hrs</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeMultiWorker(mt.id, w.id)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Add worker to this task */}
                      {mtWorkerOpen === mt.id ? (
                        <div className="flex gap-2">
                          <Select value={mtSelectedWorkerId} onValueChange={setMtSelectedWorkerId}>
                            <SelectTrigger className="h-9 text-sm flex-1"><SelectValue placeholder="Choose worker" /></SelectTrigger>
                            <SelectContent>
                              {workers.map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.name}{w.role ? ` (${w.role})` : ''}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" disabled={!mtSelectedWorkerId} onClick={() => addWorkerToMultiTask(mt.id)} className="h-9">Add</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground gap-1"
                          onClick={() => { setMtWorkerOpen(mt.id); setMtSelectedWorkerId(''); }}>
                          <UserPlus className="w-3.5 h-3.5" /> Add Worker
                        </Button>
                      )}
                    </div>
                  ))}

                  {/* Add new task form */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <Input value={mtWorkArea} onChange={e => setMtWorkArea(e.target.value)} placeholder="Work area (e.g. Level 1)" className="h-9 text-sm" />
                    <Textarea value={mtDesc} onChange={e => setMtDesc(e.target.value)} placeholder="Task description" className="text-sm min-h-[60px]" />
                    <Select value={mtSmId} onValueChange={setMtSmId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Site manager" /></SelectTrigger>
                      <SelectContent>
                        {siteManagers.map(sm => (
                          <SelectItem key={sm.id} value={sm.id}>{sm.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="w-full" disabled={!mtDesc.trim()} onClick={handleAddMultiDayTask}>
                      <Plus className="w-4 h-4 mr-1" /> Add Task
                    </Button>
                  </div>
                </div>
              )}

              <Button onClick={handleAdd} disabled={selectedDates.length === 0} className="w-full h-12 text-base">
                {isMultiDay
                  ? `Create ${selectedDates.length} Dayworks${multiTasks.length > 0 ? ` with ${multiTasks.length} task${multiTasks.length > 1 ? 's' : ''}` : ''}`
                  : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Copy from Previous Dialog */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader><DialogTitle>Copy from Previous Daywork</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>New Date *</Label>
              <Input type="date" value={copyDate} onChange={e => setCopyDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Copy tasks & workers from</Label>
              <Select value={copySourceId} onValueChange={setCopySourceId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a daywork" />
                </SelectTrigger>
                <SelectContent>
                  {sortedDays.map(dw => {
                    const firstTask = dw.tasks[0];
                    const taskSummary = firstTask
                      ? `${firstTask.workArea ? firstTask.workArea + ' – ' : ''}${firstTask.description.split('\n')[0].slice(0, 40)}${dw.tasks.length > 1 ? ` (+${dw.tasks.length - 1} more)` : ''}`
                      : 'No tasks';
                    return (
                      <SelectItem key={dw.id} value={dw.id}>
                        <div className="flex flex-col items-start">
                          <span>{format(new Date(dw.date + 'T00:00:00'), 'EEE, d MMM yyyy')}</span>
                          <span className="text-xs text-muted-foreground">{taskSummary}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              All tasks, work areas, site managers, and workers will be copied. Start/finish times will be cleared so you can fill them in.
            </p>
            <Button onClick={handleCopy} disabled={!copyDate || !copySourceId} className="w-full">
              Copy & Create Daywork
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Daywork Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader><DialogTitle>Edit Daywork</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Date *</Label><Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="mt-1" /></div>
            <div><Label>Site Contact Name</Label><Input value={editContact} onChange={e => setEditContact(e.target.value)} className="mt-1" /></div>
            <div><Label>Contact Phone</Label><Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="mt-1" /></div>
            <div><Label>PO / Contract Ref</Label><Input value={editPo} onChange={e => setEditPo(e.target.value)} className="mt-1" /></div>
            <Button onClick={handleEditSave} disabled={!editDate} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Daywork?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this daywork record and all its tasks. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { onDeleteDaywork(deleteId); setDeleteId(null); toast({ title: 'Daywork deleted' }); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

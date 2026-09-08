import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, UserPlus, Clock, ChevronDown, ChevronUp, MapPin, Check, Pencil, ClipboardList, AlertTriangle, MoreVertical, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImproveWithAI } from './ImproveWithAI';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { DayworkRecord, SiteManager, PredefinedWorker, Task, WorkerLog, DayPlan, PlanEntry, calculateWorkerHours, taskTotalHours, dayworkTotalHours, defaultPlanHours } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import SignaturePad from '@/components/SignaturePad';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
});

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = TIME_OPTIONS.includes(value) || !value ? TIME_OPTIONS : [value, ...TIME_OPTIONS];
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
    >
      {options.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

interface DayworkDetailProps {
  daywork: DayworkRecord;
  projectName: string;
  siteManagers: SiteManager[];
  workers: PredefinedWorker[];
  onBack: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'workerLogs'>) => void;
  onEditTask: (taskId: string, updates: Partial<Omit<Task, 'id' | 'workerLogs'>>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddWorkerLogs: (taskId: string, logs: Omit<WorkerLog, "id">[]) => void;
  onAddWorkerLog: (taskId: string, log: Omit<WorkerLog, 'id'>) => void;
  onUpdateWorkerLog: (taskId: string, logId: string, updates: Partial<WorkerLog>) => void;
  onDeleteWorkerLog: (taskId: string, logId: string) => void;
  onUpdateSignature: (data: { signatureData?: string; signatureName?: string; signatureDate?: string }) => void;
  onCopyTask?: (taskId: string, date: string) => void;
  plan?: DayPlan;
  /** Most recent earlier plan for this project — used to pre-tick the same crew. */
  prevPlan?: DayPlan;
  onSavePlan?: (date: string, entries: PlanEntry[]) => void;
  // Actual hours per worker aggregated across ALL dayworks on this date (plan is per day, not per record)
  dayActuals?: Map<string, number>;
}

export default function DayworkDetail({
  daywork, projectName, siteManagers, workers, onBack,
  onAddTask, onEditTask, onDeleteTask, onAddWorkerLog, onAddWorkerLogs, onUpdateWorkerLog, onDeleteWorkerLog,
  onUpdateSignature, onCopyTask, plan, prevPlan, onSavePlan, dayActuals,
}: DayworkDetailProps) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskWorkArea, setTaskWorkArea] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskSmId, setTaskSmId] = useState('');
  const [workerDialogTask, setWorkerDialogTask] = useState<string | null>(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  // Default to collapsed so days with many tasks stay tidy; tap a task to expand
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [sigOpen, setSigOpen] = useState(false);

  // Copy single task to another date (three-dot menu or long-press on the task)
  const [copyTaskId, setCopyTaskId] = useState<string | null>(null);
  const [copyDate, setCopyDate] = useState<Date | undefined>(undefined);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };
  const startPress = (taskId: string) => {
    cancelPress();
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      setCopyTaskId(taskId);
      setCopyDate(undefined);
    }, 550);
  };
  const handleCopyTask = () => {
    if (!copyTaskId || !copyDate || !onCopyTask) return;
    onCopyTask(copyTaskId, format(copyDate, 'yyyy-MM-dd'));
    setCopyTaskId(null);
    setCopyDate(undefined);
    toast({ title: '✓ Task copied', description: `Copied to ${format(copyDate, 'EEE, d MMM yyyy')}` });
  };

  // Plan hours state: tick who is on site; hours auto-fill by weekday
  const [planOpen, setPlanOpen] = useState(false);
  const [planChecked, setPlanChecked] = useState<Record<string, boolean>>({});
  const [planHours, setPlanHours] = useState<Record<string, string>>({});

  // Most-used workers first (based on this day's records and plan)
  const sortedWorkers = useMemo(() => {
    const usage = new Map<string, number>();
    daywork.tasks.forEach(t => t.workerLogs.forEach(l => {
      const k = l.workerId || l.workerName;
      usage.set(k, (usage.get(k) || 0) + 1);
    }));
    plan?.entries.forEach(e => {
      const k = e.workerId || e.workerName;
      usage.set(k, (usage.get(k) || 0) + 1);
    });
    const use = (w: PredefinedWorker) => usage.get(w.id) ?? usage.get(w.name) ?? 0;
    return [...workers].sort((a, b) => use(b) - use(a) || a.name.localeCompare(b.name));
  }, [workers, daywork.tasks, plan]);


  const planDateObj = useMemo(() => new Date(daywork.date + 'T00:00:00'), [daywork.date]);

  const openPlanDialog = () => {
    const checked: Record<string, boolean> = {};
    const init: Record<string, string> = {};
    const def = defaultPlanHours(planDateObj);
    const source = plan && plan.entries.length > 0 ? plan : undefined;
    workers.forEach(w => {
      if (source) {
        const e = source.entries.find(en => en.workerId === w.id);
        if (e && e.hours > 0) { checked[w.id] = true; init[w.id] = String(e.hours); }
      } else if (def > 0) {
        // Carry over the previous day's crew; hours use this weekday's default
        const e = prevPlan?.entries.find(en => en.workerId === w.id);
        if (e && e.hours > 0) { checked[w.id] = true; init[w.id] = String(def); }
      }
    });
    setPlanChecked(checked);
    setPlanHours(init);
    setPlanOpen(true);
  };

  const togglePlanWorker = (id: string, on: boolean) => {
    setPlanChecked(prev => ({ ...prev, [id]: on }));
    if (on) setPlanHours(prev => ({ ...prev, [id]: String(defaultPlanHours(planDateObj)) }));
  };

  const handleSavePlan = () => {
    if (!onSavePlan) return;
    const def = defaultPlanHours(planDateObj);
    const entries: PlanEntry[] = workers
      .filter(w => planChecked[w.id])
      .map(w => ({ workerId: w.id, workerName: w.name, hours: parseFloat(planHours[w.id] || '') || def }))
      .filter(e => e.hours > 0);
    onSavePlan(daywork.date, entries);
    setPlanOpen(false);
    toast({ title: entries.length > 0 ? '✓ Plan saved' : '✓ Plan cleared', description: `${format(new Date(daywork.date + 'T00:00:00'), 'EEE, d MMM yyyy')} · ${entries.length} worker${entries.length !== 1 ? 's' : ''}` });
  };

  // Plan vs actual comparison
  const planComparison = (() => {
    if (!plan || plan.entries.length === 0) return null;
    // Use the whole-day totals (all dayworks on this date) when provided
    const actualByWorker = dayActuals ?? (() => {
      const m = new Map<string, number>();
      daywork.tasks.forEach(t => t.workerLogs.forEach(l => {
        m.set(l.workerName, (m.get(l.workerName) || 0) + calculateWorkerHours(l));
      }));
      return m;
    })();
    const rows = plan.entries.map(e => {
      const a = actualByWorker.get(e.workerName) || 0;
      return { name: e.workerName, planned: e.hours, actual: a, diff: a - e.hours };
    });
    const allMatch = rows.every(r => Math.abs(r.diff) < 0.001);
    return { rows, allMatch };
  })();

  // Auto-derive site manager name from tasks
  const derivedSigName = (() => {
    const managers = [...new Set(daywork.tasks.map(t => t.siteManagerName).filter(Boolean))];
    return managers.length > 0 ? managers[0] : '';
  })();

  // Edit task state
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState('');
  const [editTaskWorkArea, setEditTaskWorkArea] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskSmId, setEditTaskSmId] = useState('');

  // Delete confirmations
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteWorkerInfo, setDeleteWorkerInfo] = useState<{ taskId: string; logId: string; name: string } | null>(null);

  const toggleTask = (id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddTask = () => {
    if (!taskDesc.trim()) return;
    const sm = siteManagers.find(s => s.id === taskSmId);
    onAddTask({
      workArea: taskWorkArea.trim(),
      description: taskDesc.trim(),
      siteManagerId: taskSmId,
      siteManagerName: sm?.name || '',
    });
    setTaskWorkArea(''); setTaskDesc(''); setTaskSmId(''); setTaskOpen(false);
    toast({ title: '✓ Task saved', description: 'Task has been added successfully.' });
  };

  const openEditTask = (task: Task) => {
    setEditTaskId(task.id);
    setEditTaskWorkArea(task.workArea);
    setEditTaskDesc(task.description);
    setEditTaskSmId(task.siteManagerId);
    setEditTaskOpen(true);
  };

  const handleEditTask = () => {
    if (!editTaskDesc.trim()) return;
    const sm = siteManagers.find(s => s.id === editTaskSmId);
    onEditTask(editTaskId, {
      workArea: editTaskWorkArea.trim(),
      description: editTaskDesc.trim(),
      siteManagerId: editTaskSmId,
      siteManagerName: sm?.name || '',
    });
    setEditTaskOpen(false);
    toast({ title: '✓ Task updated' });
  };

  const handleAddSelectedWorkers = () => {
    if (!workerDialogTask || selectedWorkerIds.size === 0) return;
    const logs = Array.from(selectedWorkerIds)
      .map(id => workers.find(pw => pw.id === id))
      .filter((w): w is NonNullable<typeof w> => !!w)
      .map(w => ({
        workerId: w.id,
        workerName: w.name,
        workerRole: w.role,
        startTime: '07:00',
        finishTime: '17:00',
        breakHours: 0.5,
      }));
    onAddWorkerLogs(workerDialogTask, logs);
    const count = logs.length;
    setSelectedWorkerIds(new Set()); setWorkerDialogTask(null);
    toast({ title: '✓ Workers added', description: `${count} worker${count !== 1 ? 's' : ''} added to the task.` });
  };

  const handleSign = (signatureDataUrl: string) => {
    if (!derivedSigName) {
      toast({ title: 'No site manager', description: 'Please assign a site manager to a task first.', variant: 'destructive' });
      return;
    }
    onUpdateSignature({
      signatureName: derivedSigName,
      signatureDate: format(new Date(), 'yyyy-MM-dd'),
      signatureData: signatureDataUrl,
    });
    setSigOpen(false);
    toast({ title: '✓ Signed off', description: 'Daywork has been signed by site manager.' });
  };

  const totalHrs = dayworkTotalHours(daywork);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 active-scale min-h-[44px] py-2 -ml-2 pl-2 pr-3 rounded-md">
          <ArrowLeft className="w-4 h-4" /> {projectName}
        </button>
        <h1 className="text-xl font-bold tracking-tight">
          {format(new Date(daywork.date + 'T00:00:00'), 'EEEE, d MMMM yyyy')}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
            <Clock className="w-3.5 h-3.5" /> {totalHrs.toFixed(1)} total hours
          </span>
          {daywork.signatureData && (
            <span className="inline-flex items-center text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-md">
              ✓ Signed
            </span>
          )}
          {onSavePlan && (
            <Button variant="outline" size="sm" onClick={openPlanDialog} className="gap-1.5 h-7 text-xs active-scale">
              <ClipboardList className="w-3.5 h-3.5" /> Plan Hours
            </Button>
          )}
        </div>
        {planComparison && (
          <div className="mt-2 space-y-1">
            {planComparison.allMatch ? (
              <span className="inline-flex items-center text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-md">✓ Matches plan</span>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Plan vs actual — whole day (all records on this date)</p>
                {planComparison.rows.filter(r => Math.abs(r.diff) >= 0.001).map(r => (
                  <p key={r.name} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    {r.name}: planned {r.planned}h / actual {r.actual.toFixed(1)}h ({r.diff > 0 ? '+' : ''}{r.diff.toFixed(1)}h)
                  </p>
                ))}
              </>
            )}
          </div>
        )}
        {daywork.siteContactName && (
          <p className="text-sm text-muted-foreground mt-1">Contact: {daywork.siteContactName}{daywork.siteContactPhone ? ` · ${daywork.siteContactPhone}` : ''}</p>
        )}
        {daywork.purchaseOrder && (
          <p className="text-sm text-muted-foreground">PO: {daywork.purchaseOrder}</p>
        )}
      </header>

      <div className="px-4 space-y-4">
        {daywork.tasks.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-muted-foreground font-medium">No tasks yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add a task to start recording work</p>
          </div>
        )}

        {daywork.tasks.map((task, i) => {
          const isExpanded = expandedTasks.has(task.id);
          const tHrs = taskTotalHours(task);
          const sm = siteManagers.find(s => s.id === task.siteManagerId);
          return (
            <div key={task.id} className="bg-card rounded-lg shadow-sm border overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <div
                className="p-4 flex items-center justify-between cursor-pointer active-scale select-none"
                onClick={() => toggleTask(task.id)}
                onPointerDown={() => onCopyTask && startPress(task.id)}
                onPointerUp={cancelPress}
                onPointerCancel={cancelPress}
                onPointerLeave={cancelPress}
                onPointerMove={cancelPress}
                onContextMenu={(e) => { if (onCopyTask) { e.preventDefault(); setCopyTaskId(task.id); setCopyDate(undefined); } }}
              >
                <div className="flex-1 min-w-0">
                  {task.workArea && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-foreground bg-accent/50 px-2 py-0.5 rounded mb-1">
                      <MapPin className="w-3 h-3" /> {task.workArea}
                    </span>
                  )}
                  <h3 className="font-semibold whitespace-pre-line">{task.description}</h3>
                  <div className="flex gap-3 mt-1">
                    <span className="text-sm text-muted-foreground">{task.workerLogs.length} worker{task.workerLogs.length !== 1 ? 's' : ''}</span>
                    <span className="text-sm text-muted-foreground">{tHrs.toFixed(1)}h</span>
                  </div>
                  {task.siteManagerName && <p className="text-xs text-muted-foreground mt-0.5">SM: {task.siteManagerName}</p>}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => openEditTask(task)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      {onCopyTask && (
                        <DropdownMenuItem onClick={() => { setCopyTaskId(task.id); setCopyDate(undefined); }}>
                          <Copy className="w-4 h-4 mr-2" /> Copy to date…
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTaskId(task.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t">
                  {sm && (
                    <div className="px-4 py-2 bg-secondary/30 text-xs text-muted-foreground">
                      Site Manager: {sm.name}{sm.phone ? ` · ${sm.phone}` : ''}{sm.email ? ` · ${sm.email}` : ''}
                    </div>
                  )}
                  {task.workerLogs.map(log => {
                    const hrs = calculateWorkerHours(log);
                    return (
                      <div key={log.id} className="p-4 border-b last:border-b-0">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-medium text-sm">{log.workerName}</span>
                            {log.workerRole && <span className="text-xs text-muted-foreground ml-2">({log.workerRole})</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary tabular-nums">{hrs.toFixed(1)}h</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteWorkerInfo({ taskId: task.id, logId: log.id, name: log.workerName })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div>
                            <Label className="text-xs text-muted-foreground">Start</Label>
                            <TimeSelect value={log.startTime}
                              onChange={v => onUpdateWorkerLog(task.id, log.id, { startTime: v })} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Finish</Label>
                            <TimeSelect value={log.finishTime}
                              onChange={v => onUpdateWorkerLog(task.id, log.id, { finishTime: v })} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Break 0.5h</Label>
                            <label className="mt-1 h-9 flex items-center gap-2 rounded-md border border-input px-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={(log.breakHours || 0) > 0}
                                onChange={e => onUpdateWorkerLog(task.id, log.id, { breakHours: e.target.checked ? 0.5 : 0 })}
                              />
                              <span className="text-sm text-muted-foreground">Yes</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="p-3">
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground gap-1.5"
                      onClick={() => { setWorkerDialogTask(task.id); setSelectedWorkerIds(new Set()); }}>
                      <UserPlus className="w-4 h-4" /> Add Worker
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Signature section */}
        {daywork.tasks.length > 0 && (
          <div className="bg-card rounded-lg border p-4 mt-6">
            <h3 className="font-semibold mb-2">Site Manager Signature</h3>
            {daywork.signatureData ? (
              <div className="space-y-2">
                <img src={daywork.signatureData} alt="Signature" className="h-16 border rounded bg-white" />
                <p className="text-sm text-muted-foreground">Signed by: <span className="text-foreground font-medium">{daywork.signatureName}</span></p>
                <p className="text-sm text-muted-foreground">Date: {daywork.signatureDate}</p>
                <Button variant="outline" size="sm" onClick={() => setSigOpen(true)}>Re-sign</Button>
              </div>
            ) : (
              <Button variant="outline" size="lg" className="w-full text-base" onClick={() => setSigOpen(true)}>
                Sign Off Daywork
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add Task FAB */}
      <div className="fixed bottom-6 right-4 left-4 flex justify-end">
        <Button size="lg" className="rounded-full shadow-lg active-scale gap-2 px-6 h-14 text-base" onClick={() => setTaskOpen(true)}>
          <Plus className="w-5 h-5" /> Add Task
        </Button>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="mx-4 max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Work Area / Location</Label>
              <Input value={taskWorkArea} onChange={e => setTaskWorkArea(e.target.value)} placeholder="e.g. Level 1, Zone A" className="mt-1 h-11 text-base" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Description of Works *</Label>
                <ImproveWithAI value={taskDesc} onChange={setTaskDesc} />
              </div>
              <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder={"e.g.\n1. Strip formwork\n2. Clean and oil panels\n3. Refix to next pour"} className="mt-1 text-base min-h-[100px]" />
            </div>
            <div>
              <Label className="mb-2 block">Site Manager</Label>
              <div className="space-y-2">
                {siteManagers.map(sm => {
                  const selected = taskSmId === sm.id;
                  return (
                    <button
                      key={sm.id}
                      type="button"
                      onClick={() => setTaskSmId(selected ? '' : sm.id)}
                      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${selected ? 'bg-primary/10 border-primary/30' : 'bg-secondary/30 hover:bg-secondary/50'}`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${selected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sm.name}</p>
                        {sm.phone && <p className="text-xs text-muted-foreground">{sm.phone}</p>}
                      </div>
                    </button>
                  );
                })}
                {siteManagers.length === 0 && <p className="text-sm text-muted-foreground">Add site managers in Settings first.</p>}
              </div>
            </div>
            <Button onClick={handleAddTask} disabled={!taskDesc.trim()} className="w-full h-12 text-base gap-2">
              <Check className="w-5 h-5" /> Save Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editTaskOpen} onOpenChange={setEditTaskOpen}>
        <DialogContent className="mx-4 max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Work Area / Location</Label>
              <Input value={editTaskWorkArea} onChange={e => setEditTaskWorkArea(e.target.value)} className="mt-1 h-11 text-base" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Description of Works *</Label>
                <ImproveWithAI value={editTaskDesc} onChange={setEditTaskDesc} />
              </div>
              <Textarea value={editTaskDesc} onChange={e => setEditTaskDesc(e.target.value)} className="mt-1 text-base min-h-[100px]" />
            </div>
            <div>
              <Label className="mb-2 block">Site Manager</Label>
              <div className="space-y-2">
                {siteManagers.map(sm => {
                  const selected = editTaskSmId === sm.id;
                  return (
                    <button
                      key={sm.id}
                      type="button"
                      onClick={() => setEditTaskSmId(selected ? '' : sm.id)}
                      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${selected ? 'bg-primary/10 border-primary/30' : 'bg-secondary/30 hover:bg-secondary/50'}`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${selected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sm.name}</p>
                        {sm.phone && <p className="text-xs text-muted-foreground">{sm.phone}</p>}
                      </div>
                    </button>
                  );
                })}
                {siteManagers.length === 0 && <p className="text-sm text-muted-foreground">Add site managers in Settings first.</p>}
              </div>
            </div>
            <Button onClick={handleEditTask} disabled={!editTaskDesc.trim()} className="w-full h-12 text-base gap-2">
              <Check className="w-5 h-5" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Task to Date Dialog */}
      <Dialog open={!!copyTaskId} onOpenChange={(v) => !v && setCopyTaskId(null)}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader><DialogTitle>Copy Task to Date</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground">
              Task, workers and times are copied as-is. If a record already exists on the chosen date, the task is added to it.
            </p>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={copyDate}
                onSelect={setCopyDate}
                className="rounded-md border"
              />
            </div>
            <Button onClick={handleCopyTask} disabled={!copyDate} className="w-full h-12 text-base gap-2">
              <Copy className="w-5 h-5" /> Copy Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Worker Dialog */}
      <Dialog open={!!workerDialogTask} onOpenChange={(v) => !v && setWorkerDialogTask(null)}>
        <DialogContent className="mx-4 max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Workers</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground">Tick the workers for this task — no need to scroll.</p>
            <div className="space-y-2">
              {sortedWorkers.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No workers yet — add workers in Settings first.</p>
              )}
              {sortedWorkers.map(w => {
                const checked = selectedWorkerIds.has(w.id);
                return (
                  <label
                    key={w.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${checked ? 'bg-primary/10 border-primary/30' : 'bg-secondary/30 hover:bg-secondary/50'}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        setSelectedWorkerIds(prev => {
                          const next = new Set(prev);
                          if (c === true) next.add(w.id); else next.delete(w.id);
                          return next;
                        });
                      }}
                      className="w-5 h-5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{w.name}</p>
                      {w.role && <p className="text-xs text-muted-foreground">{w.role}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
            <Button onClick={handleAddSelectedWorkers} disabled={selectedWorkerIds.size === 0} className="w-full h-12 text-base gap-2">
              <Check className="w-5 h-5" /> Add {selectedWorkerIds.size > 0 ? `${selectedWorkerIds.size} worker${selectedWorkerIds.size !== 1 ? 's' : ''}` : 'Workers'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <Dialog open={sigOpen} onOpenChange={setSigOpen}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader><DialogTitle>Site Manager Sign Off</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="text-sm text-muted-foreground">
              <p>Signing as: <span className="text-foreground font-medium">{derivedSigName || 'No site manager assigned'}</span></p>
            </div>
            <div>
              <Label className="mb-2 block">Signature</Label>
              <SignaturePad onSave={(dataUrl) => handleSign(dataUrl)} />
            </div>
            <p className="text-xs text-muted-foreground">By signing, you confirm this daywork record is accurate.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(v) => !v && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the task and all its worker logs. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTaskId) { onDeleteTask(deleteTaskId); setDeleteTaskId(null); toast({ title: 'Task deleted' }); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Worker Confirmation */}
      <AlertDialog open={!!deleteWorkerInfo} onOpenChange={(v) => !v && setDeleteWorkerInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Worker?</AlertDialogTitle>
            <AlertDialogDescription>Remove {deleteWorkerInfo?.name} from this task?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteWorkerInfo) { onDeleteWorkerLog(deleteWorkerInfo.taskId, deleteWorkerInfo.logId); setDeleteWorkerInfo(null); toast({ title: 'Worker removed' }); } }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Plan Hours Dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="mx-4 max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Plan Hours — {format(new Date(daywork.date + 'T00:00:00'), 'EEE, d MMM yyyy')}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground">
              Tick who is on site — hours fill in automatically (Mon–Thu 9.5h · Fri 8.5h · Sat 6h). Tap a number to change it.
            </p>
            {workers.length === 0 && (
              <p className="text-sm text-muted-foreground">Add workers in Settings first.</p>
            )}
            {sortedWorkers.map(w => {
              const on = !!planChecked[w.id];
              return (
                <div
                  key={w.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('input[type="number"]')) return;
                    togglePlanWorker(w.id, !on);
                  }}
                  className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer select-none ${on ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/30'}`}
                >
                  <Checkbox checked={on} className="w-5 h-5 pointer-events-none" tabIndex={-1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{w.name}</p>
                    {w.role && <p className="text-xs text-muted-foreground">{w.role}</p>}
                  </div>
                  {on && (
                    <>
                      <Input
                        type="number" inputMode="decimal" step="0.5" min="0"
                        value={planHours[w.id] || ''}
                        onChange={e => setPlanHours(prev => ({ ...prev, [w.id]: e.target.value }))}
                        className="w-24 text-right"
                      />
                      <span className="text-sm text-muted-foreground">h</span>
                    </>
                  )}
                </div>
              );
            })}
            <Button onClick={handleSavePlan} className="w-full h-12 text-base gap-2">
              <Check className="w-5 h-5" /> Save Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

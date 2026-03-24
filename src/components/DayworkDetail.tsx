import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, UserPlus, Clock, ChevronDown, ChevronUp, MapPin, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DayworkRecord, SiteManager, PredefinedWorker, Task, WorkerLog, calculateWorkerHours, taskTotalHours, dayworkTotalHours } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import SignaturePad from '@/components/SignaturePad';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DayworkDetailProps {
  daywork: DayworkRecord;
  projectName: string;
  siteManagers: SiteManager[];
  workers: PredefinedWorker[];
  onBack: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'workerLogs'>) => void;
  onEditTask: (taskId: string, updates: Partial<Omit<Task, 'id' | 'workerLogs'>>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddWorkerLog: (taskId: string, log: Omit<WorkerLog, 'id'>) => void;
  onUpdateWorkerLog: (taskId: string, logId: string, updates: Partial<WorkerLog>) => void;
  onDeleteWorkerLog: (taskId: string, logId: string) => void;
  onUpdateSignature: (data: { signatureData?: string; signatureName?: string; signatureDate?: string }) => void;
}

export default function DayworkDetail({
  daywork, projectName, siteManagers, workers, onBack,
  onAddTask, onEditTask, onDeleteTask, onAddWorkerLog, onUpdateWorkerLog, onDeleteWorkerLog,
  onUpdateSignature,
}: DayworkDetailProps) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskWorkArea, setTaskWorkArea] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskSmId, setTaskSmId] = useState('');
  const [workerDialogTask, setWorkerDialogTask] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set(daywork.tasks.map(t => t.id)));
  const [sigOpen, setSigOpen] = useState(false);
  const [sigName, setSigName] = useState(daywork.signatureName || '');

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

  const handleAddWorkerLog = () => {
    if (!selectedWorkerId || !workerDialogTask) return;
    const w = workers.find(pw => pw.id === selectedWorkerId);
    if (!w) return;
    onAddWorkerLog(workerDialogTask, {
      workerId: w.id,
      workerName: w.name,
      workerRole: w.role,
      startTime: '07:00',
      finishTime: '17:00',
      breakHours: 0.5,
    });
    setSelectedWorkerId(''); setWorkerDialogTask(null);
    toast({ title: '✓ Worker added', description: `${w.name} has been added to the task.` });
  };

  const handleSign = (signatureDataUrl: string) => {
    if (!sigName.trim()) {
      toast({ title: 'Name required', description: 'Please enter a printed name.', variant: 'destructive' });
      return;
    }
    onUpdateSignature({
      signatureName: sigName.trim(),
      signatureDate: format(new Date(), 'yyyy-MM-dd'),
      signatureData: signatureDataUrl,
    });
    setSigOpen(false);
    toast({ title: '✓ Signed off', description: 'Daywork has been signed by site manager.' });
  };

  const totalHrs = dayworkTotalHours(daywork);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 active-scale">
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
        </div>
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
              <div className="p-4 flex items-center justify-between cursor-pointer active-scale" onClick={() => toggleTask(task.id)}>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); openEditTask(task); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteTaskId(task.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Start</Label>
                            <Input type="time" value={log.startTime}
                              onChange={e => onUpdateWorkerLog(task.id, log.id, { startTime: e.target.value })}
                              className="mt-1 h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Finish</Label>
                            <Input type="time" value={log.finishTime}
                              onChange={e => onUpdateWorkerLog(task.id, log.id, { finishTime: e.target.value })}
                              className="mt-1 h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Break (hrs)</Label>
                            <Input type="number" step="0.25" value={log.breakHours}
                              onChange={e => onUpdateWorkerLog(task.id, log.id, { breakHours: parseFloat(e.target.value) || 0 })}
                              className="mt-1 h-9 text-sm" min={0} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="p-3">
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground gap-1.5"
                      onClick={() => { setWorkerDialogTask(task.id); setSelectedWorkerId(''); }}>
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
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Work Area / Location</Label>
              <Input value={taskWorkArea} onChange={e => setTaskWorkArea(e.target.value)} placeholder="e.g. Level 1, Zone A" className="mt-1 h-11 text-base" />
            </div>
            <div>
              <Label>Description of Works *</Label>
              <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder={"e.g.\n1. Strip formwork\n2. Clean and oil panels\n3. Refix to next pour"} className="mt-1 text-base min-h-[100px]" />
            </div>
            <div>
              <Label>Site Manager</Label>
              <Select value={taskSmId} onValueChange={setTaskSmId}>
                <SelectTrigger className="mt-1 h-11 text-base"><SelectValue placeholder="Select site manager" /></SelectTrigger>
                <SelectContent>
                  {siteManagers.map(sm => (
                    <SelectItem key={sm.id} value={sm.id}>{sm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddTask} disabled={!taskDesc.trim()} className="w-full h-12 text-base gap-2">
              <Check className="w-5 h-5" /> Save Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editTaskOpen} onOpenChange={setEditTaskOpen}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Work Area / Location</Label>
              <Input value={editTaskWorkArea} onChange={e => setEditTaskWorkArea(e.target.value)} className="mt-1 h-11 text-base" />
            </div>
            <div>
              <Label>Description of Works *</Label>
              <Textarea value={editTaskDesc} onChange={e => setEditTaskDesc(e.target.value)} className="mt-1 text-base min-h-[100px]" />
            </div>
            <div>
              <Label>Site Manager</Label>
              <Select value={editTaskSmId} onValueChange={setEditTaskSmId}>
                <SelectTrigger className="mt-1 h-11 text-base"><SelectValue placeholder="Select site manager" /></SelectTrigger>
                <SelectContent>
                  {siteManagers.map(sm => (
                    <SelectItem key={sm.id} value={sm.id}>{sm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditTask} disabled={!editTaskDesc.trim()} className="w-full h-12 text-base gap-2">
              <Check className="w-5 h-5" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Worker Dialog */}
      <Dialog open={!!workerDialogTask} onOpenChange={(v) => !v && setWorkerDialogTask(null)}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader><DialogTitle>Add Worker</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Select Worker</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger className="mt-1 h-11 text-base"><SelectValue placeholder="Choose worker" /></SelectTrigger>
                <SelectContent>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}{w.role ? ` (${w.role})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddWorkerLog} disabled={!selectedWorkerId} className="w-full h-12 text-base gap-2">
              <Check className="w-5 h-5" /> Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <Dialog open={sigOpen} onOpenChange={setSigOpen}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader><DialogTitle>Site Manager Sign Off</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Print Name *</Label>
              <Input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Full name" className="mt-1 h-11 text-base" />
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
    </div>
  );
}

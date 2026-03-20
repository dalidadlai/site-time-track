import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, UserPlus, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DayRecord, calculateHours, taskTotalHours, dayTotalHours } from '@/lib/types';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DayDetailProps {
  day: DayRecord;
  projectName: string;
  onBack: () => void;
  onAddTask: (description: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddWorker: (taskId: string, name: string) => void;
  onUpdateWorker: (taskId: string, workerId: string, updates: any) => void;
  onDeleteWorker: (taskId: string, workerId: string) => void;
}

export default function DayDetail({
  day, projectName, onBack,
  onAddTask, onDeleteTask,
  onAddWorker, onUpdateWorker, onDeleteWorker
}: DayDetailProps) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskDesc, setTaskDesc] = useState('');
  const [workerDialogTask, setWorkerDialogTask] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set(day.tasks.map(t => t.id)));

  const toggleTask = (id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddTask = () => {
    if (!taskDesc.trim()) return;
    onAddTask(taskDesc.trim());
    setTaskDesc('');
    setTaskOpen(false);
  };

  const handleAddWorker = () => {
    if (!workerName.trim() || !workerDialogTask) return;
    onAddWorker(workerDialogTask, workerName.trim());
    setWorkerName('');
    setWorkerDialogTask(null);
  };

  const totalHrs = dayTotalHours(day);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 active-scale">
          <ArrowLeft className="w-4 h-4" /> {projectName}
        </button>
        <h1 className="text-xl font-bold tracking-tight">
          {format(new Date(day.date + 'T00:00:00'), 'EEEE, d MMMM yyyy')}
        </h1>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
            <Clock className="w-3.5 h-3.5" /> {totalHrs.toFixed(1)} total hours
          </span>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {day.tasks.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-muted-foreground font-medium">No tasks yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add a task to start recording work</p>
          </div>
        )}

        {day.tasks.map((task, i) => {
          const isExpanded = expandedTasks.has(task.id);
          const tHrs = taskTotalHours(task);
          return (
            <div key={task.id} className="bg-card rounded-lg shadow-sm border overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              {/* Task header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer active-scale"
                onClick={() => toggleTask(task.id)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{task.description}</h3>
                  <div className="flex gap-3 mt-1">
                    <span className="text-sm text-muted-foreground">{task.workers.length} worker{task.workers.length !== 1 ? 's' : ''}</span>
                    <span className="text-sm text-muted-foreground">{tHrs.toFixed(1)}h</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </div>

              {/* Workers */}
              {isExpanded && (
                <div className="border-t">
                  {task.workers.map(worker => {
                    const hrs = calculateHours(worker);
                    return (
                      <div key={worker.id} className="p-4 border-b last:border-b-0">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-sm">{worker.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary tabular-nums">{hrs.toFixed(1)}h</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => onDeleteWorker(task.id, worker.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Start</Label>
                            <Input
                              type="time"
                              value={worker.startTime}
                              onChange={e => onUpdateWorker(task.id, worker.id, { startTime: e.target.value })}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Finish</Label>
                            <Input
                              type="time"
                              value={worker.finishTime}
                              onChange={e => onUpdateWorker(task.id, worker.id, { finishTime: e.target.value })}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Break (min)</Label>
                            <Input
                              type="number"
                              value={worker.breakMinutes}
                              onChange={e => onUpdateWorker(task.id, worker.id, { breakMinutes: parseInt(e.target.value) || 0 })}
                              className="mt-1 h-9 text-sm"
                              min={0}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground gap-1.5"
                      onClick={() => { setWorkerDialogTask(task.id); setWorkerName(''); }}
                    >
                      <UserPlus className="w-4 h-4" /> Add Worker
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Task FAB */}
      <div className="fixed bottom-6 right-4 left-4 flex justify-end">
        <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg active-scale gap-2 px-6">
              <Plus className="w-5 h-5" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 max-w-md">
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Task Description</Label>
                <Input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="e.g. Formwork installation" className="mt-1.5" />
              </div>
              <Button onClick={handleAddTask} disabled={!taskDesc.trim()} className="w-full">Add Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add Worker Dialog */}
      <Dialog open={!!workerDialogTask} onOpenChange={(v) => !v && setWorkerDialogTask(null)}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle>Add Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Worker Name</Label>
              <Input value={workerName} onChange={e => setWorkerName(e.target.value)} placeholder="e.g. John Murphy" className="mt-1.5" />
            </div>
            <Button onClick={handleAddWorker} disabled={!workerName.trim()} className="w-full">Add Worker</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState } from 'react';
import { ArrowLeft, Plus, Calendar, Clock, ChevronRight, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Project, dayTotalHours } from '@/lib/types';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onSelectDay: (dayId: string) => void;
  onAddDay: (date: string) => void;
  onDeleteDay: (dayId: string) => void;
  onGeneratePdf: () => void;
}

export default function ProjectDetail({ project, onBack, onSelectDay, onAddDay, onDeleteDay, onGeneratePdf }: ProjectDetailProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleAdd = () => {
    if (!date) return;
    onAddDay(date);
    setOpen(false);
  };

  const sortedDays = [...project.days].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 active-scale">
          <ArrowLeft className="w-4 h-4" /> Projects
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{project.client}{project.location ? ` · ${project.location}` : ''}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onGeneratePdf} className="gap-1.5 active-scale">
            <FileText className="w-4 h-4" /> PDF
          </Button>
        </div>
      </header>

      <div className="px-4 space-y-3">
        {sortedDays.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No days recorded</p>
            <p className="text-sm text-muted-foreground mt-1">Add a daily record to start tracking</p>
          </div>
        )}

        {sortedDays.map((day, i) => {
          const totalHrs = dayTotalHours(day);
          return (
            <div
              key={day.id}
              className="bg-card rounded-lg shadow-sm border p-4 active-scale cursor-pointer animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => onSelectDay(day.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{format(new Date(day.date + 'T00:00:00'), 'EEE, d MMM yyyy')}</h3>
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-sm text-muted-foreground">{day.tasks.length} task{day.tasks.length !== 1 ? 's' : ''}</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {totalHrs.toFixed(1)}h
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDeleteDay(day.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-6 right-4 left-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg active-scale gap-2 px-6">
              <Plus className="w-5 h-5" /> Add Day
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 max-w-md">
            <DialogHeader>
              <DialogTitle>Add Day Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <Button onClick={handleAdd} disabled={!date} className="w-full">Add Record</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

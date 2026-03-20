import React, { useState } from 'react';
import { ArrowLeft, Plus, Calendar, Clock, ChevronRight, Trash2, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Project, dayworkTotalHours } from '@/lib/types';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onSelectDaywork: (id: string) => void;
  onAddDaywork: (data: { date: string; siteContactName: string; siteContactPhone: string; purchaseOrder: string }) => void;
  onDeleteDaywork: (id: string) => void;
  onGeneratePdf: (dayworkIds: string[]) => void;
}

export default function ProjectDetail({ project, onBack, onSelectDaywork, onAddDaywork, onDeleteDaywork, onGeneratePdf }: ProjectDetailProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [po, setPo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const handleAdd = () => {
    if (!date) return;
    onAddDaywork({ date, siteContactName: contactName.trim(), siteContactPhone: contactPhone.trim(), purchaseOrder: po.trim() });
    setOpen(false); setContactName(''); setContactPhone(''); setPo('');
  };

  const sortedDays = [...project.dayworks].sort((a, b) => b.date.localeCompare(a.date));

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
              <Calendar className="w-8 h-8 text-muted-foreground" />
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
                    <Checkbox
                      checked={selectedIds.has(dw.id)}
                      onCheckedChange={() => toggleSelect(dw.id)}
                      onClick={e => e.stopPropagation()}
                      className="h-5 w-5"
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold">{format(new Date(dw.date + 'T00:00:00'), 'EEE, d MMM yyyy')}</h3>
                    <div className="flex gap-4 mt-1.5">
                      <span className="text-sm text-muted-foreground">{dw.tasks.length} task{dw.tasks.length !== 1 ? 's' : ''}</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {totalHrs.toFixed(1)}h
                      </span>
                    </div>
                    {dw.siteContactName && <p className="text-xs text-muted-foreground mt-1">Contact: {dw.siteContactName}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!selectMode && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); onGeneratePdf([dw.id]); }}>
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); onDeleteDaywork(dw.id); }}>
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

      <div className="fixed bottom-6 right-4 left-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg active-scale gap-2 px-6">
              <Plus className="w-5 h-5" /> Add Daywork
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 max-w-md">
            <DialogHeader><DialogTitle>New Daywork Record</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div><Label>Date *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" /></div>
              <div><Label>Site Contact Name</Label><Input value={contactName} onChange={e => setContactName(e.target.value)} className="mt-1" /></div>
              <div><Label>Contact Phone</Label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="mt-1" /></div>
              <div><Label>PO / Contract Ref</Label><Input value={po} onChange={e => setPo(e.target.value)} className="mt-1" /></div>
              <Button onClick={handleAdd} disabled={!date} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef } from 'react';

// Remembers scroll position + expanded months per project across navigation
const viewStateCache: Record<string, { scrollY: number; openMonths: string[] }> = {};
import { ArrowLeft, Plus, Calendar as CalendarIcon, Clock, ChevronRight, ChevronDown, Trash2, FileText, Pencil, Copy, CalendarDays, UserPlus, X, Users, ClipboardList, AlertTriangle } from 'lucide-react';
import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Project, DayworkRecord, SiteManager, PredefinedWorker, DayPlan, PlanEntry, dayworkTotalHours, calculateWorkerHours, generateId, defaultPlanHours } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { ImproveWithAI } from './ImproveWithAI';
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
  plans: DayPlan[];
  onSavePlan: (date: string, entries: PlanEntry[]) => void;
  onBack: () => void;
  onSelectDaywork: (id: string) => void;
  onAddDaywork: (data: { date: string; siteContactName: string; siteContactPhone: string; purchaseOrder: string }) => void;
  onAddDayworkWithTasks: (data: DayworkRecord) => void;
  onEditDaywork: (id: string, data: Partial<DayworkRecord>) => void;
  onDeleteDaywork: (id: string) => void;
  onGeneratePdf: (dayworkIds: string[], siteManagerId?: string, mode?: 'report' | 'jobsheet') => void;
  onNavigateToDaywork?: (dayworkId: string) => void;
}

export default function ProjectDetail({ project, onBack, onSelectDaywork, onAddDaywork, onAddDayworkWithTasks, onEditDaywork, onDeleteDaywork, onGeneratePdf, siteManagers, workers, plans, onSavePlan }: ProjectDetailProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [po, setPo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfStartDate, setPdfStartDate] = useState<Date | undefined>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [pdfEndDate, setPdfEndDate] = useState<Date | undefined>(endOfWeek(new Date(), { weekStartsOn: 1 }));
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

  const [pdfSignedOnly, setPdfSignedOnly] = useState(false);
  const [pdfSmId, setPdfSmId] = useState<string>('');
  const [filterSmId, setFilterSmId] = useState<string>('');
  const [pdfMode, setPdfMode] = useState<'report' | 'jobsheet'>('report');

  // Planned hours state: check who is on site; hours auto-fill by weekday
  // (Mon–Thu 9.5, Fri 8.5, Sat 6) and can be overridden per worker.
  const [planOpen, setPlanOpen] = useState(false);
  const [planDate, setPlanDate] = useState<Date | undefined>(new Date());
  const [planChecked, setPlanChecked] = useState<Record<string, boolean>>({});
  const [planHours, setPlanHours] = useState<Record<string, string>>({});

  const projectPlans = useMemo(() => plans.filter(p => p.projectId === project.id), [plans, project.id]);
  const planByDate = useMemo(() => {
    const m = new Map<string, DayPlan>();
    projectPlans.forEach(p => m.set(p.date, p));
    return m;
  }, [projectPlans]);

  // Workers sorted by how often they are used in this project (most used first)
  const workerUsage = useMemo(() => {
    const m = new Map<string, number>();
    project.dayworks.forEach(d => d.tasks.forEach(t => t.workerLogs.forEach(l => {
      const key = l.workerId || l.workerName;
      m.set(key, (m.get(key) || 0) + 1);
    })));
    projectPlans.forEach(p => p.entries.forEach(e => {
      const key = e.workerId || e.workerName;
      m.set(key, (m.get(key) || 0) + 1);
    }));
    return m;
  }, [project.dayworks, projectPlans]);

  const sortedWorkers = useMemo(() => {
    const use = (w: PredefinedWorker) => workerUsage.get(w.id) ?? workerUsage.get(w.name) ?? 0;
    return [...workers].sort((a, b) => use(b) - use(a) || a.name.localeCompare(b.name));
  }, [workers, workerUsage]);

  const loadPlanFor = (date: Date) => {
    const checked: Record<string, boolean> = {};
    const hours: Record<string, string> = {};
    const existing = planByDate.get(format(date, 'yyyy-MM-dd'));
    existing?.entries.forEach(e => {
      if (e.hours > 0) { checked[e.workerId] = true; hours[e.workerId] = String(e.hours); }
    });
    setPlanChecked(checked);
    setPlanHours(hours);
  };

  const openPlanDialog = () => {
    const today = new Date();
    setPlanDate(today);
    loadPlanFor(today);
    setPlanOpen(true);
  };

  const handlePlanDateChange = (date: Date | undefined) => {
    setPlanDate(date);
    if (date) loadPlanFor(date);
  };

  const togglePlanWorker = (id: string, on: boolean, date: Date) => {
    setPlanChecked(prev => ({ ...prev, [id]: on }));
    if (on) {
      // Pre-fill the weekday default so it can be tweaked inline
      setPlanHours(prev => ({ ...prev, [id]: String(defaultPlanHours(date)) }));
    }
  };

  const handleSavePlan = () => {
    if (!planDate) return;
    const def = defaultPlanHours(planDate);
    const entries: PlanEntry[] = sortedWorkers
      .filter(w => planChecked[w.id])
      .map(w => ({
        workerId: w.id,
        workerName: w.name,
        hours: parseFloat(planHours[w.id] || '') || def,
      }))
      .filter(e => e.hours > 0);
    onSavePlan(format(planDate, 'yyyy-MM-dd'), entries);
    setPlanOpen(false);
    toast({
      title: entries.length > 0 ? '✓ Plan saved' : '✓ Plan cleared',
      description: `${format(planDate, 'EEE, d MMM yyyy')} · ${entries.length} worker${entries.length !== 1 ? 's' : ''}`,
    });
  };


  const sortedDays = [...project.dayworks].sort((a, b) => b.date.localeCompare(a.date));
  const filteredDays = useMemo(() => {
    if (!filterSmId) return sortedDays;
    return sortedDays.filter(dw => dw.tasks.some(t => t.siteManagerId === filterSmId));
  }, [sortedDays, filterSmId]);

  // Group daywork records by month (newest month first)
  const monthGroups = useMemo(() => {
    const map = new Map<string, DayworkRecord[]>();
    for (const dw of filteredDays) {
      const key = dw.date.slice(0, 7); // yyyy-MM
      const list = map.get(key);
      if (list) list.push(dw);
      else map.set(key, [dw]);
    }
    return [...map.entries()].map(([key, days]) => ({
      key,
      label: format(new Date(key + '-01T00:00:00'), 'MMMM yyyy'),
      days,
      hours: days.reduce((sum, d) => sum + dayworkTotalHours(d), 0),
    }));
  }, [filteredDays]);

  // Aggregate actual hours per worker across ALL dayworks on the same date
  const dayActualsByDate = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    project.dayworks.forEach(d => {
      let dm = m.get(d.date);
      if (!dm) { dm = new Map<string, number>(); m.set(d.date, dm); }
      d.tasks.forEach(t => t.workerLogs.forEach(w => {
        const name = w.workerName || 'Worker';
        dm!.set(name, (dm!.get(name) || 0) + calculateWorkerHours(w));
      }));
    });
    return m;
  }, [project.dayworks]);

  // Newest daywork id per date — the plan comparison shows once per day, on that card
  const firstIdByDate = useMemo(() => {
    const m = new Map<string, string>();
    filteredDays.forEach(dw => { if (!m.has(dw.date)) m.set(dw.date, dw.id); });
    return m;
  }, [filteredDays]);

  const [openMonths, setOpenMonths] = useState<Set<string>>(() => {
    const cached = viewStateCache[project.id];
    if (cached) return new Set(cached.openMonths);
    return new Set(monthGroups.slice(0, 1).map(g => g.key));
  });

  // Restore scroll position when coming back from a daywork, and remember it on leave
  const openMonthsRef = useRef(openMonths);
  openMonthsRef.current = openMonths;

  useEffect(() => {
    const cached = viewStateCache[project.id];
    if (cached?.scrollY) {
      requestAnimationFrame(() => window.scrollTo(0, cached.scrollY));
    }
    return () => {
      viewStateCache[project.id] = {
        scrollY: window.scrollY,
        openMonths: [...openMonthsRef.current],
      };
    };
  }, [project.id]);

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const pdfMatchedIds = useMemo(() => {
    if (!pdfStartDate || !pdfEndDate) return [];
    const s = format(pdfStartDate, 'yyyy-MM-dd');
    const e = format(pdfEndDate, 'yyyy-MM-dd');
    return sortedDays
      .filter(dw => dw.date >= s && dw.date <= e)
      .filter(dw => !pdfSignedOnly || (dw.signatureData && dw.signatureData.length > 0))
      .filter(dw => !pdfSmId || dw.tasks.some(t => t.siteManagerId === pdfSmId))
      .map(dw => dw.id);
  }, [pdfStartDate, pdfEndDate, sortedDays, pdfSignedOnly, pdfSmId]);

  const applyPdfPreset = (preset: 'thisWeek' | 'last2Weeks' | 'thisMonth') => {
    const now = new Date();
    if (preset === 'thisWeek') {
      setPdfStartDate(startOfWeek(now, { weekStartsOn: 1 }));
      setPdfEndDate(endOfWeek(now, { weekStartsOn: 1 }));
    } else if (preset === 'last2Weeks') {
      setPdfStartDate(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }));
      setPdfEndDate(endOfWeek(now, { weekStartsOn: 1 }));
    } else {
      setPdfStartDate(startOfMonth(now));
      setPdfEndDate(endOfMonth(now));
    }
  };

  const handlePdfGenerate = () => {
    if (pdfMatchedIds.length === 0) {
      toast({ title: 'No dayworks found in selected range' });
      return;
    }
    onGeneratePdf(pdfMatchedIds, pdfSmId || undefined, pdfMode);
    setPdfOpen(false);
  };

  const handleAdd = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    onAddDaywork({ date: dateStr, siteContactName: contactName.trim(), siteContactPhone: contactPhone.trim(), purchaseOrder: po.trim() });
    setOpen(false); setContactName(''); setContactPhone(''); setPo('');
    setSelectedDate(new Date());
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openPlanDialog} className="gap-1.5 active-scale">
              <ClipboardList className="w-4 h-4" /> Plan Hours
            </Button>
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
        </div>
      </header>

      <div className="px-4 space-y-3">
        {sortedDays.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={() => setFilterSmId('')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterSmId === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80'}`}
              >
                All
              </button>
              {siteManagers.map(sm => (
                <button
                  key={sm.id}
                  onClick={() => setFilterSmId(filterSmId === sm.id ? '' : sm.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterSmId === sm.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80'}`}
                >
                  {sm.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredDays.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <CalendarIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              {filterSmId ? 'No daywork records for this site manager' : 'No daywork records'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {filterSmId ? 'Try another manager or clear the filter' : 'Add a daily record to start tracking'}
            </p>
          </div>
        )}

        {monthGroups.map(group => {
          const isOpen = openMonths.has(group.key);
          return (
            <div key={group.key} className="space-y-3">
              <button
                onClick={() => toggleMonth(group.key)}
                className="w-full flex items-center justify-between bg-secondary/60 rounded-lg px-4 py-3 active-scale"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="font-semibold truncate">{group.label}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {group.days.length} day{group.days.length !== 1 ? 's' : ''} · {group.hours.toFixed(1)}h
                </span>
              </button>
              {isOpen && group.days.map((dw, i) => {
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
                    {(() => {
                      const totals = new Map<string, number>();
                      dw.tasks.forEach(t => t.workerLogs.forEach(w => {
                        const name = w.workerName || 'Worker';
                        totals.set(name, (totals.get(name) || 0) + calculateWorkerHours(w));
                      }));
                      if (totals.size === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                          {[...totals.entries()].map(([name, hrs]) => (
                            <span key={name} className="text-xs text-muted-foreground">
                              {name} <span className="font-medium text-foreground">{hrs.toFixed(1)}h</span>
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                    {(() => {
                      // Plan is per person per day — compare against the whole day's total
                      // across every daywork record on this date, shown once on the newest card.
                      if (firstIdByDate.get(dw.date) !== dw.id) return null;
                      const plan = planByDate.get(dw.date);
                      if (!plan || plan.entries.length === 0) return null;
                      const actual = dayActualsByDate.get(dw.date);
                      const rows = plan.entries.map(e => {
                        const a = actual?.get(e.workerName) || 0;
                        return { name: e.workerName, planned: e.hours, actual: a, diff: a - e.hours };
                      });
                      const mismatches = rows.filter(r => Math.abs(r.diff) > 0.001);
                      if (mismatches.length === 0) {
                        return (
                          <div className="mt-1.5">
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-[10px] px-2 py-0">✓ Matches plan</Badge>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Plan vs actual — whole day</p>
                          {mismatches.map(r => (
                            <p key={r.name} className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {r.name}: planned {r.planned}h / actual {r.actual.toFixed(1)}h ({r.diff > 0 ? '+' : ''}{r.diff.toFixed(1)}h)
                            </p>
                          ))}
                        </div>
                      );
                    })()}
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
          );
        })}
      </div>

      {/* Generate PDF dialog */}
      {sortedDays.length > 0 && !selectMode && (
        <div className="px-4 mt-4">
          <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <CalendarDays className="w-4 h-4" /> Generate PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-4 max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Generate PDF</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={pdfMode === 'report' ? 'default' : 'outline'} className="h-11"
                    onClick={() => setPdfMode('report')}>Daywork Report</Button>
                  <Button variant={pdfMode === 'jobsheet' ? 'default' : 'outline'} className="h-11"
                    onClick={() => setPdfMode('jobsheet')}>Job Sheet</Button>
                </div>
                {pdfMode === 'jobsheet' && (
                  <p className="text-xs text-muted-foreground">Job Sheet: multi-day compact sheet, each worker shows total hours only.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => applyPdfPreset('thisWeek')}>This Week</Button>
                  <Button size="sm" variant="outline" onClick={() => applyPdfPreset('last2Weeks')}>Last 2 Weeks</Button>
                  <Button size="sm" variant="outline" onClick={() => applyPdfPreset('thisMonth')}>This Month</Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" className="mt-1" value={pdfStartDate ? format(pdfStartDate, 'yyyy-MM-dd') : ''}
                      onChange={e => setPdfStartDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" className="mt-1" value={pdfEndDate ? format(pdfEndDate, 'yyyy-MM-dd') : ''}
                      onChange={e => setPdfEndDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="pdfSignedOnly" checked={pdfSignedOnly} onCheckedChange={(v) => setPdfSignedOnly(!!v)} />
                  <Label htmlFor="pdfSignedOnly" className="text-sm cursor-pointer">Signed only</Label>
                </div>
                <div>
                  <Label className="mb-2 block">Site Manager</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setPdfSmId('')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${pdfSmId === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80'}`}
                    >
                      All
                    </button>
                    {siteManagers.map(sm => (
                      <button
                        key={sm.id}
                        onClick={() => setPdfSmId(pdfSmId === sm.id ? '' : sm.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${pdfSmId === sm.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80'}`}
                      >
                        {sm.name}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pdfMatchedIds.length} daywork{pdfMatchedIds.length !== 1 ? 's' : ''} found{pdfSignedOnly ? ' (signed)' : ''}{pdfSmId ? ' · filtered by site manager' : ''}
                </p>
                <Button className="w-full gap-2" onClick={handlePdfGenerate} disabled={pdfMatchedIds.length === 0}>
                  <FileText className="w-4 h-4" /> {pdfMode === 'jobsheet' ? 'Generate Job Sheet' : 'Generate PDF'} ({pdfMatchedIds.length})
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Plan Hours Dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="mx-4 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Plan Hours</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Date *</Label>
              <p className="text-xs text-muted-foreground mb-2">Select one day to plan.</p>
              <Calendar
                mode="single"
                selected={planDate}
                onSelect={handlePlanDateChange}
                className="rounded-md border mx-auto pointer-events-auto"
              />
              {planDate && (
                <p className="text-xs text-muted-foreground mt-1">{format(planDate, 'EEE, d MMM yyyy')}</p>
              )}
            </div>
            <div>
              <Label>Who is on site?</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Tick the workers coming in — hours fill in automatically (Mon–Thu 9.5h · Fri 8.5h · Sat 6h). Tap a number to change it.
              </p>
              <div className="space-y-2">
                {sortedWorkers.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">No workers yet — add workers in Settings first.</p>
                )}
                {sortedWorkers.map(w => {
                  const on = !!planChecked[w.id];
                  return (
                    <div
                      key={w.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('input[type="number"]')) return;
                        togglePlanWorker(w.id, !on, planDate ?? new Date());
                      }}
                      className={`flex items-center gap-2 rounded-lg p-2.5 cursor-pointer select-none ${on ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/30'}`}
                    >
                      <Checkbox checked={on} className="w-5 h-5 pointer-events-none" tabIndex={-1} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{w.name}</span>
                        {w.role && <span className="text-xs text-muted-foreground ml-1">({w.role})</span>}
                      </div>
                      {on && (
                        <>
                          <Input
                            type="number" step="0.5" min={0} max={24}
                            value={planHours[w.id] ?? ''}
                            onChange={e => setPlanHours(prev => ({ ...prev, [w.id]: e.target.value }))}
                            className="w-20 h-9 text-sm text-center"
                          />
                          <span className="text-xs text-muted-foreground">hrs</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Button onClick={handleSavePlan} disabled={!planDate || sortedWorkers.length === 0} className="w-full h-12 text-base">
              Save Plan
            </Button>

          </div>
        </DialogContent>
      </Dialog>

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
                <Label>Select Date *</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border mx-auto pointer-events-auto"
                />
              </div>
              <div><Label>Site Contact Name</Label><Input value={contactName} onChange={e => setContactName(e.target.value)} className="mt-1" /></div>
              <div><Label>Contact Phone</Label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="mt-1" /></div>
              <div><Label>PO / Contract Ref</Label><Input value={po} onChange={e => setPo(e.target.value)} className="mt-1" /></div>

              <Button onClick={handleAdd} disabled={!selectedDate} className="w-full h-12 text-base">
                Create
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
              All tasks, work areas, site managers, workers and their start/finish times will be copied as-is — adjust afterwards only where the new day differs.
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

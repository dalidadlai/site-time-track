import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Loader2, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { flushCloudPush } from '@/lib/cloudSync';
import { attendanceDate, attendanceSchema, attendanceTime, compareAttendance, linkSchema } from '@/lib/attendance';
import type { DayPlan, Project } from '@/lib/types';
import { toast } from 'sonner';

export default function ProjectAttendance({ project, plans }: { project: Project; plans: DayPlan[] }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(attendanceDate());
  const [link, setLink] = useState<z.infer<typeof linkSchema>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<'rotate' | 'disable'>();
  async function manage(action: 'get' | 'rotate' | 'disable' = 'get') {
    setBusy(true); setError('');
    try {
      await flushCloudPush();
      const { data, error: apiError } = await supabase.rpc('manage_attendance_link', { p_project_id: project.id, p_action: action });
      if (apiError) throw apiError;
      setLink(linkSchema.parse(data)); setConfirmAction(undefined);
    } catch { setError('Unable to load the QR code. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (open) void manage(); }, [open, project.id]);
  const query = useQuery({ queryKey: ['attendance', project.id, date], enabled: open && Boolean(date), refetchInterval: 15000, queryFn: async () => {
    const { data, error: apiError } = await supabase.rpc('list_project_attendance', { p_project_id: project.id, p_date: date });
    if (apiError) throw apiError;
    return attendanceSchema.array().parse(data);
  } });
  const plan = plans.find(p => p.projectId === project.id && p.date === date);
  const rows = compareAttendance(plan, query.data ?? []);
  const checkinUrl = link ? `https://hcgdaywork.lovable.app/check-in/${link.token}` : '';
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5"><QrCode className="w-4 h-4" />Attendance / QR</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Attendance · {project.name}</DialogTitle></DialogHeader>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      {busy && <Loader2 className="animate-spin text-muted-foreground" />}
      {link?.active && <section className="space-y-3 border-b pb-4"><div className="attendance-qr mx-auto w-fit p-4 rounded-md"><QRCodeSVG value={checkinUrl} size={192} title={`${project.name} check-in`} /></div><p className="text-center text-xs text-muted-foreground">此二维码长期有效，无需每天更换。员工每天扫码签到，系统自动记录当天日期。</p><div className="flex flex-wrap justify-center gap-2"><Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(checkinUrl); toast.success('Check-in link copied'); } catch { toast.error('Could not copy link'); } }}><Copy className="w-4 h-4 mr-2" />Copy link</Button><Button variant="outline" size="sm" onClick={() => setConfirmAction('rotate')}>Replace QR</Button><Button variant="outline" size="sm" onClick={() => setConfirmAction('disable')}>Disable QR</Button></div></section>}
      {link && !link.active && <Button disabled={busy} onClick={() => void manage('rotate')}>Enable new QR</Button>}
      {confirmAction && <div className="space-y-3 border-b pb-4"><p className="text-sm">{confirmAction === 'rotate' ? 'Replace this QR code? The previous code will stop working.' : 'Disable this QR code? Employees will no longer be able to check in.'}</p><div className="flex gap-2"><Button variant="destructive" disabled={busy} onClick={() => void manage(confirmAction)}>Confirm</Button><Button variant="outline" onClick={() => setConfirmAction(undefined)}>Cancel</Button></div></div>}
      {!link && !busy && error && <Button variant="outline" onClick={() => void manage()}>Retry</Button>}
      <div className="flex items-end gap-2"><label className="flex-1 space-y-1 text-sm">Date · Auckland<Input aria-label="Attendance date" type="date" value={date} onChange={e => setDate(e.target.value)} /></label><Button variant="outline" size="icon" aria-label="Refresh attendance" onClick={() => void query.refetch()}><RefreshCw className={`w-4 h-4 ${query.isFetching ? 'animate-spin' : ''}`} /></Button></div>
      <p className="text-sm text-muted-foreground">{query.data?.length ?? 0} checked in · {plan?.entries.filter(e => e.hours > 0).length ?? 0} planned</p>
      {query.isError ? <p role="alert" className="text-destructive">Attendance could not be loaded. Please refresh.</p> : query.isPending ? <Loader2 className="animate-spin text-muted-foreground" /> : <div className="divide-y">{rows.map(row => <div key={row.workerId} className="py-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium break-words">{row.workerName}</p><p className="text-xs text-muted-foreground">{row.plannedHours > 0 ? `Plan ${row.plannedHours}h` : 'Not planned'}{row.record ? ` · ${attendanceTime(row.record.checkedInAt)}` : ''}</p></div><Badge variant={row.record ? 'default' : 'outline'} className="shrink-0">{row.record ? 'Checked in' : 'Not checked in'}</Badge></div>)}{rows.length === 0 && <p className="text-sm text-muted-foreground py-4">No saved plan or check-ins for this date.</p>}</div>}
    </DialogContent></Dialog>
  </>;
}
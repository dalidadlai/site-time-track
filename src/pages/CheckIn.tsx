import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { CheckCircle2, HardHat, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { attendanceTime, getCheckinInfo, infoSchema, receiptSchema, submitCheckin } from '@/lib/attendance';

export default function CheckIn() {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<z.infer<typeof infoSchema>>();
  const [receipt, setReceipt] = useState<z.infer<typeof receiptSchema>>();
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getCheckinInfo(token).then(data => { if (!cancelled) setInfo(data); }).catch(() => { if (!cancelled) setError('This check-in link is unavailable. Please ask your manager for the current QR code.'); });
    return () => { cancelled = true; };
  }, [token]);
  async function checkIn() {
    setBusy(true); setError('');
    try { setReceipt(await submitCheckin(token, selected)); }
    catch { setError('Check-in could not be saved. Please check your connection and try again.'); }
    finally { setBusy(false); }
  }
  return <main className="max-w-lg mx-auto px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10 space-y-6">
    <header className="space-y-2"><HardHat className="h-9 w-9 text-primary" /><h1 className="text-2xl font-bold">{info?.projectName ?? 'Worker Check-in'}</h1><p className="text-muted-foreground">Daily Check-in{info ? ` · ${info.date} · Auckland` : ''}</p></header>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {!info && !error && <Loader2 className="animate-spin text-muted-foreground" />}
    {receipt ? <section className="space-y-3 py-6"><CheckCircle2 className="w-12 h-12 text-success" /><h2 className="text-xl font-semibold">{receipt.alreadyCheckedIn ? 'Already checked in' : 'Check-in saved'}</h2><p className="font-medium">{receipt.workerName}</p><p className="text-muted-foreground">{receipt.date} · {attendanceTime(receipt.checkedInAt)}</p></section> : info && <section className="space-y-4">
      <h2 className="font-semibold">Your name</h2>
      <Input aria-label="Search names" placeholder="Search names" value={search} onChange={e => setSearch(e.target.value)} />
      <div role="radiogroup" aria-label="Worker name" className="space-y-2">{info.workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase())).map(w => <label key={w.id} className={`flex items-center gap-3 p-3 min-h-12 border rounded-md cursor-pointer ${selected === w.id ? 'border-primary bg-secondary' : 'border-border'}`}><input type="radio" name="worker" value={w.id} checked={selected === w.id} onChange={() => setSelected(w.id)} className="accent-primary w-5 h-5" /><span>{w.name}</span></label>)}</div>
      {info.workers.length === 0 && <p className="text-muted-foreground">No workers available. Please contact your manager.</p>}
      <Button className="w-full min-h-12 gap-2" disabled={!selected || busy} onClick={checkIn}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Check in</Button>
    </section>}
  </main>;
}
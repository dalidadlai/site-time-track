import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Building2, Users, HardHat, Upload, X, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CompanyProfile, SiteManager, PredefinedWorker, TaskTemplate } from '@/lib/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

interface SettingsPageProps {
  company: CompanyProfile;
  siteManagers: SiteManager[];
  workers: PredefinedWorker[];
  taskTemplates: TaskTemplate[];
  onUpdateCompany: (c: CompanyProfile) => void;
  onAddSiteManager: (sm: Omit<SiteManager, 'id'>) => void;
  onDeleteSiteManager: (id: string) => void;
  onAddWorker: (w: Omit<PredefinedWorker, 'id'>) => void;
  onDeleteWorker: (id: string) => void;
  onAddTaskTemplate: (t: Omit<TaskTemplate, 'id' | 'usedAt'>) => void;
  onDeleteTaskTemplate: (id: string) => void;
  onBack: () => void;
}

export default function SettingsPage({
  company, siteManagers, workers, taskTemplates,
  onUpdateCompany, onAddSiteManager, onDeleteSiteManager,
  onAddWorker, onDeleteWorker, onAddTaskTemplate, onDeleteTaskTemplate, onBack,
}: SettingsPageProps) {
  const [companyForm, setCompanyForm] = useState(company);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCompanyForm({ ...companyForm, logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };
  const [smOpen, setSmOpen] = useState(false);
  const [smName, setSmName] = useState('');
  const [smPhone, setSmPhone] = useState('');
  const [smEmail, setSmEmail] = useState('');
  const [wOpen, setWOpen] = useState(false);
  const [wName, setWName] = useState('');
  const [wRole, setWRole] = useState('');
  const [ttOpen, setTtOpen] = useState(false);
  const [ttWorkArea, setTtWorkArea] = useState('');
  const [ttDesc, setTtDesc] = useState('');

  const handleSaveCompany = () => onUpdateCompany(companyForm);

  const handleAddSm = () => {
    if (!smName.trim()) return;
    onAddSiteManager({ name: smName.trim(), phone: smPhone.trim(), email: smEmail.trim() });
    setSmName(''); setSmPhone(''); setSmEmail(''); setSmOpen(false);
  };

  const handleAddWorker = () => {
    if (!wName.trim()) return;
    onAddWorker({ name: wName.trim(), role: wRole.trim() });
    setWName(''); setWRole(''); setWOpen(false);
  };

  const handleAddTemplate = () => {
    if (!ttDesc.trim()) return;
    onAddTaskTemplate({ workArea: ttWorkArea.trim(), description: ttDesc.trim() });
    setTtWorkArea(''); setTtDesc(''); setTtOpen(false);
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 active-scale">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </header>

      <div className="px-4 space-y-6">
        {/* Company Profile */}
        <section className="bg-card rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Company Profile</h2>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Company Logo</Label>
            <div className="mt-1 flex items-center gap-3">
              {companyForm.logo ? (
                <div className="relative">
                  <img src={companyForm.logo} alt="Logo" className="h-12 w-auto rounded border bg-white p-1" />
                  <button onClick={() => setCompanyForm({ ...companyForm, logo: undefined })} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md hover:bg-secondary transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {companyForm.logo ? 'Change' : 'Upload Logo'}
                <input type="file" accept="image/*,.pdf" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Company Name</Label>
            <Input value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Input value={companyForm.address} onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} className="mt-1" />
            </div>
          </div>
          <Button onClick={handleSaveCompany} size="sm" className="w-full">Save Company Info</Button>
        </section>

        {/* Site Managers */}
        <section className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Site Managers</h2>
            </div>
            <Dialog open={smOpen} onOpenChange={setSmOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 h-8"><Plus className="w-4 h-4" /> Add</Button>
              </DialogTrigger>
              <DialogContent className="mx-4 max-w-md">
                <DialogHeader><DialogTitle>Add Site Manager</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div><Label>Name *</Label><Input value={smName} onChange={e => setSmName(e.target.value)} className="mt-1" /></div>
                  <div><Label>Phone</Label><Input value={smPhone} onChange={e => setSmPhone(e.target.value)} className="mt-1" /></div>
                  <div><Label>Email</Label><Input value={smEmail} onChange={e => setSmEmail(e.target.value)} className="mt-1" /></div>
                  <Button onClick={handleAddSm} disabled={!smName.trim()} className="w-full">Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {siteManagers.length === 0 && <p className="text-sm text-muted-foreground">No site managers added yet</p>}
          <div className="space-y-2">
            {siteManagers.map(sm => (
              <div key={sm.id} className="flex items-center justify-between bg-secondary/50 rounded-md p-3">
                <div>
                  <p className="font-medium text-sm">{sm.name}</p>
                  <p className="text-xs text-muted-foreground">{[sm.phone, sm.email].filter(Boolean).join(' · ')}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDeleteSiteManager(sm.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Workers */}
        <section className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardHat className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Workers</h2>
            </div>
            <Dialog open={wOpen} onOpenChange={setWOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 h-8"><Plus className="w-4 h-4" /> Add</Button>
              </DialogTrigger>
              <DialogContent className="mx-4 max-w-md">
                <DialogHeader><DialogTitle>Add Worker</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div><Label>Name *</Label><Input value={wName} onChange={e => setWName(e.target.value)} className="mt-1" /></div>
                  <div><Label>Role</Label><Input value={wRole} onChange={e => setWRole(e.target.value)} placeholder="e.g. Builder, Labourer" className="mt-1" /></div>
                  <Button onClick={handleAddWorker} disabled={!wName.trim()} className="w-full">Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {workers.length === 0 && <p className="text-sm text-muted-foreground">No workers added yet</p>}
          <div className="space-y-2">
            {workers.map(w => (
              <div key={w.id} className="flex items-center justify-between bg-secondary/50 rounded-md p-3">
                <div>
                  <p className="font-medium text-sm">{w.name}</p>
                  {w.role && <p className="text-xs text-muted-foreground">{w.role}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDeleteWorker(w.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

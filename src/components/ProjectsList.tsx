import React, { useState } from 'react';
import { Plus, HardHat, MapPin, User, ChevronRight, Trash2, Settings, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Project } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectsListProps {
  projects: Project[];
  onAdd: (name: string, client: string, siteAddress: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { name?: string; client?: string; siteAddress?: string }) => void;
  onSettings: () => void;
}

export default function ProjectsList({ projects, onAdd, onSelect, onDelete, onEdit, onSettings }: ProjectsListProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [siteAddress, setSiteAddress] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), client.trim(), siteAddress.trim());
    setName(''); setClient(''); setSiteAddress(''); setOpen(false);
  };

  const openEdit = (p: Project) => {
    setEditId(p.id);
    setEditName(p.name);
    setEditClient(p.client);
    setEditAddress(p.siteAddress);
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editName.trim()) return;
    onEdit(editId, { name: editName.trim(), client: editClient.trim(), siteAddress: editAddress.trim() });
    setEditOpen(false);
    toast({ title: '✓ Project updated' });
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <HardHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Daywork Tracker</h1>
              <p className="text-sm text-muted-foreground">Construction time records</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onSettings} className="text-muted-foreground">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="px-4 space-y-3">
        {projects.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <HardHat className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first project to get started</p>
          </div>
        )}

        {projects.map((project, i) => (
          <div key={project.id} className="bg-card rounded-lg shadow-sm border p-4 active-scale cursor-pointer animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }} onClick={() => onSelect(project.id)}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{project.name}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  {project.client && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> {project.client}
                    </span>
                  )}
                  {project.siteAddress && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {project.siteAddress}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {project.dayworks.length} daywork{project.dayworks.length !== 1 ? 's' : ''} recorded
                </p>
              </div>
              <div className="flex items-center gap-1 ml-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={(e) => { e.stopPropagation(); openEdit(project); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-6 right-4 left-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg active-scale gap-2 px-6">
              <Plus className="w-5 h-5" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 max-w-md">
            <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>Project Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tower Block A" className="mt-1.5" /></div>
              <div><Label>Client / Company</Label><Input value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. ABC Construction" className="mt-1.5" /></div>
              <div><Label>Site Address</Label><Input value={siteAddress} onChange={e => setSiteAddress(e.target.value)} placeholder="e.g. 123 Main Street" className="mt-1.5" /></div>
              <Button onClick={handleAdd} disabled={!name.trim()} className="w-full">Create Project</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Project Name *</Label><Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Client / Company</Label><Input value={editClient} onChange={e => setEditClient(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Site Address</Label><Input value={editAddress} onChange={e => setEditAddress(e.target.value)} className="mt-1.5" /></div>
            <Button onClick={handleEdit} disabled={!editName.trim()} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the project and all its daywork records. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); toast({ title: 'Project deleted' }); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

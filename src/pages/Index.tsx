import React, { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import ProjectsList from '@/components/ProjectsList';
import ProjectDetail from '@/components/ProjectDetail';
import DayDetail from '@/components/DayDetail';
import { generateDayworkPdf } from '@/lib/pdfReport';

type View = 
  | { screen: 'projects' }
  | { screen: 'project'; projectId: string }
  | { screen: 'day'; projectId: string; dayId: string };

const Index = () => {
  const [view, setView] = useState<View>({ screen: 'projects' });
  const {
    projects, addProject, deleteProject,
    addDay, deleteDay,
    addTask, deleteTask,
    addWorker, updateWorker, deleteWorker,
  } = useProjects();

  if (view.screen === 'projects') {
    return (
      <div className="max-w-lg mx-auto">
        <ProjectsList
          projects={projects}
          onAdd={(name, client, location) => {
            const p = addProject(name, client, location);
            setView({ screen: 'project', projectId: p.id });
          }}
          onSelect={(id) => setView({ screen: 'project', projectId: id })}
          onDelete={deleteProject}
        />
      </div>
    );
  }

  const project = projects.find(p => p.id === view.projectId);
  if (!project) {
    setView({ screen: 'projects' });
    return null;
  }

  if (view.screen === 'project') {
    return (
      <div className="max-w-lg mx-auto">
        <ProjectDetail
          project={project}
          onBack={() => setView({ screen: 'projects' })}
          onSelectDay={(dayId) => setView({ screen: 'day', projectId: project.id, dayId })}
          onAddDay={(date) => {
            const d = addDay(project.id, date);
            setView({ screen: 'day', projectId: project.id, dayId: d.id });
          }}
          onDeleteDay={(dayId) => deleteDay(project.id, dayId)}
          onGeneratePdf={() => generateDayworkPdf(project)}
        />
      </div>
    );
  }

  if (view.screen === 'day') {
    const day = project.days.find(d => d.id === view.dayId);
    if (!day) {
      setView({ screen: 'project', projectId: project.id });
      return null;
    }

    return (
      <div className="max-w-lg mx-auto">
        <DayDetail
          day={day}
          projectName={project.name}
          onBack={() => setView({ screen: 'project', projectId: project.id })}
          onAddTask={(desc) => addTask(project.id, day.id, desc)}
          onDeleteTask={(taskId) => deleteTask(project.id, day.id, taskId)}
          onAddWorker={(taskId, name) => addWorker(project.id, day.id, taskId, name)}
          onUpdateWorker={(taskId, workerId, updates) => updateWorker(project.id, day.id, taskId, workerId, updates)}
          onDeleteWorker={(taskId, workerId) => deleteWorker(project.id, day.id, taskId, workerId)}
        />
      </div>
    );
  }

  return null;
};

export default Index;

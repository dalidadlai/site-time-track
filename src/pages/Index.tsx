import React, { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useSettings } from '@/hooks/useSettings';
import ProjectsList from '@/components/ProjectsList';
import ProjectDetail from '@/components/ProjectDetail';
import DayworkDetail from '@/components/DayworkDetail';
import SettingsPage from '@/components/SettingsPage';
import { generateDayworkPdf } from '@/lib/pdfReport';

type View =
  | { screen: 'projects' }
  | { screen: 'settings' }
  | { screen: 'project'; projectId: string }
  | { screen: 'daywork'; projectId: string; dayworkId: string };

const Index = () => {
  const [view, setView] = useState<View>({ screen: 'projects' });
  const {
    projects, addProject, updateProject, deleteProject,
    addDaywork, addDayworkWithTasks, updateDaywork, deleteDaywork,
    addTask, updateTask, deleteTask,
    addWorkerLog, updateWorkerLog, deleteWorkerLog,
  } = useProjects();

  const {
    company, updateCompany,
    siteManagers, addSiteManager, deleteSiteManager,
    workers, addWorker, deleteWorker,
    taskTemplates, addTaskTemplate, deleteTaskTemplate, touchTaskTemplate,
  } = useSettings();

  if (view.screen === 'settings') {
    return (
      <div className="max-w-lg mx-auto">
        <SettingsPage
          company={company} siteManagers={siteManagers} workers={workers}
          taskTemplates={taskTemplates}
          onUpdateCompany={updateCompany}
          onAddSiteManager={addSiteManager} onDeleteSiteManager={deleteSiteManager}
          onAddWorker={addWorker} onDeleteWorker={deleteWorker}
          onAddTaskTemplate={addTaskTemplate} onDeleteTaskTemplate={deleteTaskTemplate}
          onBack={() => setView({ screen: 'projects' })}
        />
      </div>
    );
  }

  if (view.screen === 'projects') {
    return (
      <div className="max-w-lg mx-auto">
        <ProjectsList
          projects={projects}
          onAdd={(name, client, siteAddress) => {
            const p = addProject(name, client, siteAddress);
            setView({ screen: 'project', projectId: p.id });
          }}
          onSelect={(id) => setView({ screen: 'project', projectId: id })}
          onDelete={deleteProject}
          onEdit={(id, updates) => updateProject(id, updates)}
          onSettings={() => setView({ screen: 'settings' })}
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
          onSelectDaywork={(id) => setView({ screen: 'daywork', projectId: project.id, dayworkId: id })}
          onAddDaywork={(data) => {
            const d = addDaywork(project.id, data);
            setView({ screen: 'daywork', projectId: project.id, dayworkId: d.id });
          }}
          onAddDayworkWithTasks={(dw) => {
            addDayworkWithTasks(project.id, dw);
            setView({ screen: 'daywork', projectId: project.id, dayworkId: dw.id });
          }}
          onEditDaywork={(id, data) => updateDaywork(project.id, id, data)}
          onDeleteDaywork={(id) => deleteDaywork(project.id, id)}
          onGeneratePdf={(dayworkIds) => generateDayworkPdf(project, company, siteManagers, dayworkIds)}
        />
      </div>
    );
  }

  if (view.screen === 'daywork') {
    const dw = project.dayworks.find(d => d.id === view.dayworkId);
    if (!dw) {
      setView({ screen: 'project', projectId: project.id });
      return null;
    }

    return (
      <div className="max-w-lg mx-auto">
        <DayworkDetail
          daywork={dw}
          projectName={project.name}
          siteManagers={siteManagers}
          workers={workers}
          taskTemplates={taskTemplates}
          onBack={() => setView({ screen: 'project', projectId: project.id })}
          onAddTask={(task) => addTask(project.id, dw.id, task)}
          onEditTask={(taskId, updates) => updateTask(project.id, dw.id, taskId, updates)}
          onDeleteTask={(taskId) => deleteTask(project.id, dw.id, taskId)}
          onAddWorkerLog={(taskId, log) => addWorkerLog(project.id, dw.id, taskId, log)}
          onUpdateWorkerLog={(taskId, logId, updates) => updateWorkerLog(project.id, dw.id, taskId, logId, updates)}
          onDeleteWorkerLog={(taskId, logId) => deleteWorkerLog(project.id, dw.id, taskId, logId)}
          onUpdateSignature={(data) => updateDaywork(project.id, dw.id, data)}
          onTouchTaskTemplate={touchTaskTemplate}
          onAddTaskTemplate={addTaskTemplate}
        />
      </div>
    );
  }

  return null;
};

export default Index;

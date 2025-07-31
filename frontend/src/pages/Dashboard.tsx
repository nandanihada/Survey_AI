import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectService } from '../services/projectService';
import { Project } from '../../../shared/types';
import toast from 'react-hot-toast';
import { LogOutIcon, PlusIcon, EditIcon, Trash2Icon } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectService.getUserProjects();
      if (response.data.success) {
        setProjects(response.data.data);
      } else {
        toast.error('Failed to load projects');
      }
    } catch (error) {
      console.error('Fetch projects error:', error);
      toast.error('Failed to load projects');
    }
  };

  const handleCreateProject = async () => {
    try {
      const projectName = 'Untitled Project';
      const newProject = await projectService.createProject({ name: projectName });

      if (newProject.data.success) {
        toast.success('Project created successfully');
        navigate(`/project/${newProject.data.data.projectId}`);
      }
    } catch (error) {
      console.error('Create project error:', error);
      toast.error('Failed to create project');
    }
  };

  const handleEdit = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleDelete = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await projectService.deleteProject(projectId);
      if (response.data.success) {
        toast.success('Project deleted successfully');
        fetchProjects();
      }
    } catch (error) {
      console.error('Delete project error:', error);
      toast.error('Failed to delete project');
    }
  };

  return (
    <div className="container">
      <header className="dashboard-header">
        <div className="dashboard-nav">
          <h1 className="dashboard-title">Projects</h1>
          <div className="user-menu">
            <span className="user-info">{user?.email}</span>
            <button className="btn btn-outline" onClick={logout}>
              <LogOutIcon />
            </button>
          </div>
        </div>
      </header>
      <div className="projects-grid">
        {projects && projects.length > 0 ? (
          projects.map(project => (
            <div key={project.projectId} className="project-card">
              <div className="project-meta">
                <span className="project-id">ID: {project.projectId}</span>
              </div>
              <div className="project-title">{project.name}</div>
              <div className="project-description">{project.description || 'No description available.'}</div>
              <div className="project-actions">
                <button className="btn btn-secondary" onClick={() => handleEdit(project.projectId)}>
                  <EditIcon />
                  Edit
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(project.projectId)}>
                  <Trash2Icon />
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>No projects available. Create a new one now!</p>
        )}
      </div>
      <button className="btn btn-primary" onClick={handleCreateProject}>
        <PlusIcon />
        Create Project
      </button>
    </div>
  );
};

export default Dashboard;

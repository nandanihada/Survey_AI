import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../../../shared/types';
import toast from 'react-hot-toast';

const ProjectEdit: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId]);

  const fetchProject = async (id: string) => {
    try {
      const response = await projectService.getProject(id);
      if (response.data.success) {
        setProject(response.data.data);
      } else {
        toast.error('Project not found');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Fetch project error:', error);
      toast.error('Failed to load project');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="card">
          <h2>Project not found</h2>
          <p>The requested project could not be found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="project-editor">
        <div className="editor-header">
          <div>
            <h1>{project.name}</h1>
            <p>Project ID: {project.projectId}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        <div className="card">
          <h3>Project Settings</h3>
          <p><strong>Name:</strong> {project.name}</p>
          <p><strong>Description:</strong> {project.description || 'No description'}</p>
          <p><strong>Questions:</strong> {project.questions?.length || 0}</p>
        </div>

        <div className="widget-integration">
          <h3 className="integration-title">Widget Integration</h3>
          <p>Add this code to your website to embed the widget:</p>
          <div className="code-block">
{`<!-- Add this where you want the widget to appear -->
<div id="dynamic-widget" data-project-id="${project.projectId}"></div>

<!-- Add this script tag before closing </body> tag -->
<script src="https://your-widget-domain.com/widget.js"></script>`}
          </div>
          <button 
            className="copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(
                `<div id="dynamic-widget" data-project-id="${project.projectId}"></div>\n<script src="https://your-widget-domain.com/widget.js"></script>`
              );
              toast.success('Integration code copied!');
            }}
          >
            Copy Code
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectEdit;

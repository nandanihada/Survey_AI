import api from './authService';
import { AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  Project, 
  CreateProjectRequest, 
  UpdateProjectRequest 
} from '../../../shared/types';

export const projectService = {
  createProject: async (projectData: CreateProjectRequest): Promise<AxiosResponse<ApiResponse<Project>>> => {
    const response = await api.post('/widget', projectData);
    return response;
  },

  getProject: async (projectId: string): Promise<AxiosResponse<ApiResponse<Project>>> => {
    const response = await api.get(`/widget/${projectId}`);
    return response;
  },

  updateProject: async (projectId: string, projectData: UpdateProjectRequest): Promise<AxiosResponse<ApiResponse<Project>>> => {
    const response = await api.put(`/widget/${projectId}`, projectData);
    return response;
  },

  getUserProjects: async (): Promise<AxiosResponse<ApiResponse<Project[]>>> => {
    const response = await api.get('/user/projects');
    return response;
  },

  deleteProject: async (projectId: string): Promise<AxiosResponse<ApiResponse<void>>> => {
    const response = await api.delete(`/user/projects/${projectId}`);
    return response;
  },

  getProjectResponses: async (projectId: string): Promise<AxiosResponse<ApiResponse<any[]>>> => {
    const response = await api.get(`/user/projects/${projectId}/responses`);
    return response;
  }
};

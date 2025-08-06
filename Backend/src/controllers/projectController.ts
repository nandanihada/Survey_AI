import { Request, Response } from 'express';
import Project from '../models/Project';
import WidgetResponse from '../models/WidgetResponse';
import { ApiResponse, CreateProjectRequest, UpdateProjectRequest } from '../../../shared/types';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';

export const getProject = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: project.toJSON()
    } as ApiResponse);

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project'
    } as ApiResponse);
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description }: CreateProjectRequest = req.body;
    const userId = req.user!.userId;

    const project = new Project({
      name,
      description,
      userId,
      questions: [],
      settings: {}
    });

    await project.save();

    res.status(201).json({
      success: true,
      data: project.toJSON(),
      message: 'Project created successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    } as ApiResponse);
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const updateFields: UpdateProjectRequest = req.body;

    const project = await Project.findOneAndUpdate(
      { projectId },
      { $set: updateFields },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: project.toJSON(),
      message: 'Project updated successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    } as ApiResponse);
  }
};

const sendWebhookNotification = async (data: any) => {
  const webhookUrl = 'https://hook.eu2.make.com/582wnttqwkv7tgoizpvdv1grwux0gpir';
  
  try {
    const response = await axios.post(webhookUrl, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });
    
    if (response.status === 200) {
      console.log('Webhook notification sent successfully to Make.com');
    } else {
      console.log(`Failed to send webhook. Status code: ${response.status}`);
    }
  } catch (error) {
    console.error('Error sending webhook to Make.com:', error);
  }
};

export const submitResponse = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { responses } = req.body;

    const widgetResponse = new WidgetResponse({
      projectId,
      responses,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    await widgetResponse.save();

    // Prepare webhook data
    const webhookData = {
      projectId,
      responses,
      submittedAt: new Date(),
      responseId: widgetResponse._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown'
    };

    // Send webhook notification to Make.com
    await sendWebhookNotification(webhookData);

    res.status(201).json({
      success: true,
      message: 'Response submitted successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit response'
    } as ApiResponse);
  }
};

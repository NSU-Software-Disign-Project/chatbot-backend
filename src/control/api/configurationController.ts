import { Request, Response } from 'express';
import {
  upsertProject,
  getAllProjects,
  getProjectByName,
  deleteProjectByName,
  getProjectConfiguration,
} from '../db/databaseController';

// Сохранение проекта
export async function saveProjectConfiguration(req: Request, res: Response) {
  try {
    const projectName = req.params.name;
    const projectData = req.body;

    if (!projectName) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    projectData.name = projectName;
    console.log('Project data:', projectData);
    const updatedProject = await upsertProject(projectData);

    res.status(200).json({
      message: 'Project configuration saved successfully',
      data: updatedProject,
    });
  } catch (error) {
    console.error('Error saving project configuration:', error);
    res.status(500).json({ message: 'Failed to save project', error });
  }
}

// Получение всех проектов
export async function getAllProjectConfigurations(req: Request, res: Response) {
  try {
    const projects = await getAllProjects();

    res.status(200).json({
      message: 'Projects retrieved successfully',
      data: projects,
    });
  } catch (error) {
    console.error('Error retrieving projects:', error);
    res.status(500).json({ message: 'Failed to retrieve projects', error });
  }
}

// Получение конфигурации проекта по имени
export async function getProjectConfigurationByName(req: Request, res: Response) {
  try {
    const projectName = req.params.name;

    if (!projectName) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    const project = await getProjectConfiguration(projectName);

    res.status(200).json({
      message: 'Project configuration retrieved successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error retrieving project configuration:', error);
    res.status(500).json({ message: 'Failed to retrieve project configuration', error });
  }
}

// Удаление проекта
export async function deleteProjectConfiguration(req: Request, res: Response) {
  try {
    const projectName = req.params.name;

    if (!projectName) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    await deleteProjectByName(projectName);

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project', error });
  }
}

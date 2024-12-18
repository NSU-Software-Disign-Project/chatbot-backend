// controllers/projectController.ts
import { Request, Response } from 'express';
import {
  upsertProject,
  getAllProjects,
  getProjectByName,
  deleteProjectByName,
} from '../db/databaseController';

// Сохранение проекта
export async function saveConfiguration(req: Request, res: Response) {
  try {
    const projectData = req.body;
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
export async function getAllConfigurations(req: Request, res: Response) {
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

// Получение проекта по имени
export async function getConfiguration(req: Request, res: Response) {
  try {
    const projectName = req.query.projectName as string;

    if (!projectName) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    const project = await getProjectByName(projectName);

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    res.status(200).json({
      message: 'Project retrieved successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error retrieving project:', error);
    res.status(500).json({ message: 'Failed to retrieve project', error });
  }
}

// Удаление проекта
export async function deleteConfiguration(req: Request, res: Response) {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    await deleteProjectByName(name);

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project', error });
  }
}

import { Request, Response } from 'express';
import {
  upsertProject,
  getAllProjects,
  deleteProjectByName,
  getProjectConfiguration,
  shareProject,
  getUserAccessibleProjects,
  getProjectByShareableId,
  checkProjectAccess,
} from '../db/databaseController';
import { prisma } from '../db/database';

// Сохранение проекта
export async function saveProjectConfiguration(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const projectName = req.params.name;
    const projectData = req.body;
    const userId = (req as any).user?.userId; // Changed AuthenticatedRequest to any as it's no longer imported

    if (!projectName) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized: userId missing' });
      return;
    }

    projectData.name = projectName;
    console.log('Project data:', projectData);
    const updatedProject = await upsertProject(projectData, userId);

    res.status(200).json({
      message: 'Project configuration saved successfully',
      data: updatedProject,
    });
    return;
  } catch (error) {
    console.error('Error saving project configuration:', error);
    res.status(500).json({ message: 'Failed to save project', error });
    return;
  }
}

// Получение всех проектов
export async function getAllProjectConfigurations(
  _req: Request,
  res: Response,
) {
  try {
    console.log('Вызов getAllProjectConfigurations');
    const projects = await getAllProjects();

    res.status(200).json({
      message: 'Projects retrieved successfully',
      data: projects,
    });
  } catch (error) {
    console.error('Ошибка получения проектов:', error);
    res.status(500).json({
      message: 'Failed to retrieve projects',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
}

// Получение конфигурации проекта по имени
export async function getProjectConfigurationByName(
  req: Request,
  res: Response,
) {
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
    res
      .status(500)
      .json({ message: 'Failed to retrieve project configuration', error });
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

// Получение активных пользователей в проекте
export async function getActiveUsersInProject(req: Request, res: Response) {
  try {
    const projectName = req.params.name;

    if (!projectName) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    // Get active users from WebSocket service
    const socketServer = (global as any).socketServer;
    if (socketServer) {
      const activeUsers = socketServer.getActiveUsersInProject(projectName);
      res.status(200).json({
        message: 'Active users retrieved successfully',
        data: activeUsers,
      });
    } else {
      res.status(200).json({
        message: 'Active users retrieved successfully',
        data: [],
      });
    }
  } catch (error) {
    console.error('Error retrieving active users:', error);
    res.status(500).json({ message: 'Failed to retrieve active users', error });
  }
}

// Share project with another user
export async function shareProjectController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // console.log('DEBUG shareProjectController req.body:', req.body);
    const projectId = req.params.projectId;
    const { targetUserEmail, permission = 'view' } = req.body;
    const userId = (req as any).user?.userId; // Changed AuthenticatedRequest to any as it's no longer imported

    // console.log('Share project request:', {
    //   projectId,
    //   targetUserEmail,
    //   permission,
    //   userId,
    //   body: req.body,
    //   headers: req.headers
    // });

    if (!projectId) {
      res.status(400).json({ message: 'Project ID is required' });
      return;
    }

    if (!targetUserEmail) {
      res.status(400).json({ message: 'Target user email is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const share = await shareProject(
      projectId,
      userId,
      targetUserEmail,
      permission,
    );

    res.status(200).json({
      message: 'Project shared successfully',
      data: share,
    });
  } catch (error) {
    console.error('Error sharing project:', error);
    res.status(500).json({
      message: 'Failed to share project',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Get user's accessible projects (owned + shared)
export async function getAccessibleProjectsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = (req as any).user?.userId; // Changed AuthenticatedRequest to any as it's no longer imported

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const projects = await getUserAccessibleProjects(userId);

    res.status(200).json({
      message: 'Projects retrieved successfully',
      data: projects,
    });
  } catch (error) {
    console.error('Error retrieving accessible projects:', error);
    res.status(500).json({
      message: 'Failed to retrieve projects',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Get project by shareable ID (for public/shared access)
export async function getProjectByShareableIdController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const userId = (req as any).user?.userId; // Changed AuthenticatedRequest to any as it's no longer imported

    console.log('DEBUG getProjectByShareableIdController:', {
      projectId,
      userId,
      headers: req.headers,
    });

    if (!projectId) {
      res.status(400).json({ message: 'Project ID is required' });
      return;
    }

    const project = await getProjectByShareableId(projectId);
    console.log('DEBUG project found:', project ? 'yes' : 'no');

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Check access permissions
    const access = await checkProjectAccess(projectId, userId || '', 'view');
    console.log('DEBUG access check:', access);

    if (!access.hasAccess) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.status(200).json({
      message: 'Project retrieved successfully',
      data: project,
      access: access,
    });
  } catch (error) {
    console.error('Error retrieving project:', error);
    res.status(500).json({
      message: 'Failed to retrieve project',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Check project access permissions
export async function checkProjectAccessController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const userId = (req as any).user?.userId; // Changed AuthenticatedRequest to any as it's no longer imported
    const { permission = 'view' } = req.query;

    if (!projectId) {
      res.status(400).json({ message: 'Project ID is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const access = await checkProjectAccess(
      projectId,
      userId,
      permission as string,
    );

    res.status(200).json({
      message: 'Access check completed',
      data: access,
    });
  } catch (error) {
    console.error('Error checking project access:', error);
    res.status(500).json({
      message: 'Failed to check access',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Create collaborative project (Google Docs style)
export async function createCollaborativeProjectController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { name, nodeDataArray = [], linkDataArray = [] } = req.body;
    const userId = (req as any).user?.userId; // Changed AuthenticatedRequest to any as it's no longer imported

    if (!name) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Generate share token for collaborative access
    const shareToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Create project with collaborative sharing enabled
    const project = await prisma.project.create({
      data: {
        name,
        userId,
        projectId: generateProjectId(),
        nodeDataArray,
        linkDataArray,
        isCollaborative: true,
        shareToken,
        anonymousUsers: [],
      } as any,
    });

    res.status(201).json({
      message: 'Collaborative project created successfully',
      data: {
        project,
        shareToken,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/collaborative/${shareToken}`,
      },
    });
  } catch (error) {
    console.error('Error creating collaborative project:', error);
    res.status(500).json({
      message: 'Failed to create collaborative project',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Get collaborative project by share token (no auth required)
export async function getCollaborativeProjectController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { shareToken } = req.params;

    console.log(`REST API: Loading project data for shareToken: ${shareToken}`);

    if (!shareToken) {
      res.status(400).json({ message: 'Share token is required' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { shareToken } as any,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      } as any,
    });

    if (!project) {
      console.log(`REST API: Project not found for shareToken: ${shareToken}`);
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (!(project as any).isCollaborative) {
      console.log(
        `REST API: Project is not collaborative for shareToken: ${shareToken}`,
      );
      res.status(403).json({ message: 'This project is not collaborative' });
      return;
    }

    console.log(
      `REST API: Returning project data with ${(project as any).nodeDataArray?.length || 0} nodes and ${(project as any).linkDataArray?.length || 0} links`,
    );
    console.log('REST API: nodeDataArray:', (project as any).nodeDataArray);
    console.log('REST API: linkDataArray:', (project as any).linkDataArray);

    res.status(200).json({
      message: 'Project retrieved successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error retrieving collaborative project:', error);
    res.status(500).json({
      message: 'Failed to retrieve project',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Update collaborative project (no auth required)
export async function updateCollaborativeProjectController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { shareToken } = req.params;
    const { nodeDataArray, linkDataArray } = req.body;

    if (!shareToken) {
      res.status(400).json({ message: 'Share token is required' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { shareToken } as any,
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (!(project as any).isCollaborative) {
      res.status(403).json({ message: 'This project is not collaborative' });
      return;
    }

    // Reject saves that only contain placeholder nodes (like 1-2-3, or only a startBlock with no other blocks)
    const validBlockTypes = [
      'startBlock',
      'messageBlock',
      'apiBlock',
      'conditionalBlock',
      'optionsBlock',
      'saveBlock',
    ];
    const isValidNode = (n: any) => {
      const isValid =
        n &&
        n.type &&
        validBlockTypes.includes(n.type) &&
        (typeof n.id === 'number' || typeof n.id === 'string') &&
        n.id !== undefined &&
        n.id !== null;
      if (!isValid) {
        console.warn('Invalid node detected:', n);
      }
      return isValid;
    };

    console.log('Received nodeDataArray:', nodeDataArray);
    console.log('Received linkDataArray:', linkDataArray);

    const hasValidNodes =
      Array.isArray(nodeDataArray) &&
      nodeDataArray.length > 0 &&
      nodeDataArray.some(isValidNode);

    if (!hasValidNodes) {
      console.warn('Rejected save: no valid nodes received:', nodeDataArray);
      res
        .status(400)
        .json({ message: 'Project must contain at least one valid block.' });
      return;
    }

    // Filter out any invalid nodes before saving
    const filteredNodeDataArray = nodeDataArray.filter(isValidNode);
    console.log('Saving filtered nodes:', filteredNodeDataArray);

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: {
        nodeDataArray: filteredNodeDataArray,
        linkDataArray: linkDataArray || (project as any).linkDataArray,
        updatedAt: new Date(),
      } as any,
    });

    console.log('Project updated successfully:', updatedProject);
    res.status(200).json({
      message: 'Project updated successfully',
      data: updatedProject,
    });
  } catch (error) {
    console.error('Error updating collaborative project:', error);
    res.status(500).json({
      message: 'Failed to update project',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Delete collaborative project (auth required - only owner can delete)
export async function deleteCollaborativeProjectController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.userId;

    if (!projectId) {
      res.status(400).json({ message: 'Project ID is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Find the project and verify ownership
    const project = await prisma.project.findFirst({
      where: { projectId } as any,
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (project.userId !== userId) {
      res
        .status(403)
        .json({ message: 'Only project owner can delete the project' });
      return;
    }

    // Delete the project
    await prisma.project.delete({
      where: { id: project.id },
    });

    res.status(200).json({
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting collaborative project:', error);
    res.status(500).json({
      message: 'Failed to delete project',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Generate unique project ID
function generateProjectId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

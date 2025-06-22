import { prisma } from './database';
import { Model } from '../../entity/BotModel';
import { jsonToNodeData, jsonToLinkData } from './jsonToModel';
import crypto from 'crypto';

// Generate unique project ID (like Google Docs)
function generateProjectId(): string {
  // Generate a random string similar to Google Docs IDs
  return crypto.randomBytes(12).toString('base64url');
}

// Migration function to add projectId to existing projects
export async function migrateExistingProjects() {
  try {
    // Get all projects without projectId
    const projectsWithoutId = await prisma.project.findMany({
      where: {
        projectId: null,
      },
    });

    console.log(`Found ${projectsWithoutId.length} projects without projectId`);

    // Update each project with a new projectId
    for (const project of projectsWithoutId) {
      const newProjectId = generateProjectId();
      await prisma.project.update({
        where: { id: project.id },
        data: { projectId: newProjectId },
      });
      console.log(
        `Updated project ${project.name} with projectId: ${newProjectId}`,
      );
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Сохранение или обновление проекта
export async function upsertProject(data: any, userId: string) {
  const { name, nodeDataArray, linkDataArray, projectId } = data;

  if (!name) {
    throw new Error('Project name is required');
  }

  // If projectId is provided, update existing project
  if (projectId) {
    return prisma.project.upsert({
      where: { projectId },
      update: {
        updatedAt: new Date(),
        nodeDataArray: nodeDataArray || [],
        linkDataArray: linkDataArray || [],
      },
      create: {
        projectId,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodeDataArray: nodeDataArray || [],
        linkDataArray: linkDataArray || [],
        userId,
      },
    });
  }

  // Create new project with generated projectId
  const newProjectId = generateProjectId();

  return prisma.project.create({
    data: {
      projectId: newProjectId,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeDataArray: nodeDataArray || [],
      linkDataArray: linkDataArray || [],
      userId,
    },
  });
}

// Get project by shareable projectId
export async function getProjectByShareableId(projectId: string) {
  return prisma.project.findFirst({
    where: { projectId } as any,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      shares: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

// Share project with another user
export async function shareProject(
  projectId: string,
  ownerUserId: string,
  targetUserEmail: string,
  permission: string = 'view',
) {
  // First, verify the project exists and belongs to the owner
  const project = await prisma.project.findFirst({
    where: {
      projectId,
      userId: ownerUserId,
    },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // Find the target user
  const targetUser = await prisma.user.findUnique({
    where: { email: targetUserEmail },
  });

  if (!targetUser) {
    throw new Error('User not found');
  }

  if (targetUser.id === ownerUserId) {
    throw new Error('Cannot share project with yourself');
  }

  // Create or update the share
  return prisma.projectShare.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: targetUser.id,
      },
    },
    update: {
      permission,
      updatedAt: new Date(),
    },
    create: {
      projectId: project.id,
      userId: targetUser.id,
      permission,
    },
  });
}

// Get user's accessible projects (owned + shared)
export async function getUserAccessibleProjects(userId: string) {
  const ownedProjects = await prisma.project.findMany({
    where: { userId },
    select: {
      id: true,
      projectId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      isPublic: true,
      canEdit: true,
      isCollaborative: true,
      shareToken: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const sharedProjects = await prisma.projectShare.findMany({
    where: { userId },
    include: {
      project: {
        select: {
          id: true,
          projectId: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          isPublic: true,
          canEdit: true,
          isCollaborative: true,
          shareToken: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { project: { updatedAt: 'desc' } },
  });

  return {
    owned: ownedProjects,
    shared: sharedProjects.map((share) => ({
      ...share.project,
      permission: share.permission,
    })),
  };
}

// Check if user has access to project
export async function checkProjectAccess(
  projectId: string,
  userId: string,
  requiredPermission: string = 'view',
) {
  const project = await prisma.project.findUnique({
    where: { projectId },
    include: {
      shares: {
        where: { userId },
      },
    },
  });

  if (!project) {
    return { hasAccess: false, permission: null };
  }

  // Owner has full access
  if (project.userId === userId) {
    return { hasAccess: true, permission: 'admin' };
  }

  // Check public access
  if (project.isPublic) {
    if (requiredPermission === 'view') {
      return { hasAccess: true, permission: 'view' };
    }
    if (requiredPermission === 'edit' && project.canEdit) {
      return { hasAccess: true, permission: 'edit' };
    }
  }

  // Check shared access - only if user has a share record
  if (project.shares.length > 0) {
    const share = project.shares[0];
    const permissionLevels = { view: 1, edit: 2, admin: 3 };
    const requiredLevel =
      permissionLevels[requiredPermission as keyof typeof permissionLevels] ||
      1;
    const userLevel =
      permissionLevels[share.permission as keyof typeof permissionLevels] || 0;

    return {
      hasAccess: userLevel >= requiredLevel,
      permission: share.permission,
    };
  }

  return { hasAccess: false, permission: null };
}

// Получение всех проектов
export async function getAllProjects() {
  return prisma.project.findMany();
}

// Получение проекта по имени
export async function getProjectByName(name: string) {
  return prisma.project.findUnique({
    where: { name },
  });
}

// Удаление проекта по имени
export async function deleteProjectByName(name: string) {
  const project = await prisma.project.findFirst({ where: { name } });

  if (!project) throw new Error('Project not found');

  return prisma.project.delete({ where: { id: project.id } });
}

// Получение конфигурации проекта по имени
export async function getProjectConfiguration(name: string): Promise<Model> {
  const project = await prisma.project.findFirst({
    where: { name },
  });

  if (!project) throw new Error('Project not found');

  return {
    nodeDataArray: project.nodeDataArray.map(jsonToNodeData),
    linkDataArray: project.linkDataArray.map(jsonToLinkData),
  };
}

// Create project with collaborative sharing enabled
export async function createCollaborativeProject(
  name: string,
  userId: string,
  nodeDataArray: any[] = [],
  linkDataArray: any[] = [],
) {
  const shareToken = generateShareToken();
  const projectId = generateProjectId();

  return prisma.project.create({
    data: {
      name,
      userId,
      projectId,
      nodeDataArray,
      linkDataArray,
      isCollaborative: true,
      shareToken,
      anonymousUsers: [],
    },
  });
}

// Generate unique share token
function generateShareToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// Get project by share token (for collaborative editing)
export async function getProjectByShareToken(shareToken: string) {
  return prisma.project.findFirst({
    where: { shareToken } as any,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

// Add anonymous user to project
export async function addAnonymousUser(
  projectId: string,
  anonymousUserId: string,
  userInfo: any,
) {
  const project = await prisma.project.findFirst({
    where: { projectId } as any,
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const anonymousUsers = project.anonymousUsers as any[];
  const existingUserIndex = anonymousUsers.findIndex(
    (user) => user.id === anonymousUserId,
  );

  if (existingUserIndex >= 0) {
    // Update existing user
    anonymousUsers[existingUserIndex] = {
      ...anonymousUsers[existingUserIndex],
      ...userInfo,
    };
  } else {
    // Add new user
    anonymousUsers.push({
      id: anonymousUserId,
      ...userInfo,
      joinedAt: new Date().toISOString(),
    });
  }

  return prisma.project.update({
    where: { id: project.id },
    data: { anonymousUsers },
  });
}

// Remove anonymous user from project
export async function removeAnonymousUser(
  projectId: string,
  anonymousUserId: string,
) {
  const project = await prisma.project.findFirst({
    where: { projectId } as any,
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const anonymousUsers = (project.anonymousUsers as any[]).filter(
    (user) => user.id !== anonymousUserId,
  );

  return prisma.project.update({
    where: { id: project.id },
    data: { anonymousUsers },
  });
}

// Check collaborative access (anyone with link can edit)
export async function checkCollaborativeAccess(shareToken: string) {
  const project = await prisma.project.findFirst({
    where: { shareToken } as any,
  });

  if (!project) {
    return { hasAccess: false, project: null };
  }

  if (!project.isCollaborative) {
    return { hasAccess: false, project: null };
  }

  return { hasAccess: true, project };
}

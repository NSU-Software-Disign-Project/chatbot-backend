import { prisma } from './database';
import { Model } from '../../entity/BotModel';
import { jsonToNodeData, jsonToLinkData } from './jsonToModel';

// Сохранение или обновление проекта
export async function upsertProject(data: any) {
  const { name, nodeDataArray, linkDataArray, ownerId, sharedWith } = data;

  if (!name) {
    throw new Error('Project name is required');
  }

  return prisma.project.upsert({
    where: { name },
    update: {
      updatedAt: new Date(),
      nodeDataArray: nodeDataArray || [],
      linkDataArray: linkDataArray || [],
      ownerId: ownerId,
      sharedWith: sharedWith || [],
    },
    create: {
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeDataArray: nodeDataArray || [],
      linkDataArray: linkDataArray || [],
      ownerId: ownerId,
      sharedWith: sharedWith || [],
    },
  });
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

export async function getProjectsByOwnerId(ownerId: string) {
  return prisma.project.findMany({ where: { ownerId } });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

// Получение всех проектов, доступных пользователю (владелец или в sharedWith)
export async function getProjectsForUser(userId: string) {
  const projects = await prisma.project.findMany({});
  return projects
    .filter(project => {
      const shared = Array.isArray(project.sharedWith) ? project.sharedWith as any[] : [];
      return project.ownerId === userId || shared.some((sw: any) => sw.userId === userId);
    })
    .map(project => {
      let role = 'viewer';
      const shared = Array.isArray(project.sharedWith) ? project.sharedWith as any[] : [];
      if (project.ownerId === userId) {
        role = 'owner';
      } else {
        const found = shared.find((sw: any) => sw.userId === userId);
        if (found && found.permission) {
          role = found.permission;
        }
      }
      return { ...project, role };
    });
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

// Получить пользователя по email
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

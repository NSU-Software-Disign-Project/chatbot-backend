import { PrismaClient } from '@prisma/client';
import { Model } from '../../entity/BotModel';
import { jsonToNodeData, jsonToLinkData } from './jsonToModel';

const prisma = new PrismaClient();

// Сохранение или обновление проекта
export async function upsertProject(data: any) {
  const { name, nodeDataArray, linkDataArray } = data;

  if (!name) {
    throw new Error('Project name is required');
  }

  return prisma.project.upsert({
    where: { name },
    update: {
      updatedAt: new Date(),
      nodeDataArray: nodeDataArray || [],
      linkDataArray: linkDataArray || [],
    },
    create: {
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeDataArray: nodeDataArray || [],
      linkDataArray: linkDataArray || [],
    },
  });
}

// Получение всех проектов
export async function getAllProjects() {
  return prisma.project.findMany();
}

// Получение проекта по имени
export async function getProjectByName(name: string) {
  return prisma.project.findFirst({
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

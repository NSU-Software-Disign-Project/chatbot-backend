// db/projectService.ts
import { PrismaClient } from '@prisma/client';
import { ObjectId } from 'mongodb';

const prisma = new PrismaClient();

// Сохранение или обновление проекта
export async function upsertProject(data: any) {
  const { name, nodeDataArray, linkDataArray } = data;

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

// Получение одного проекта по имени
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

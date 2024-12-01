import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ObjectId } from 'mongodb';

const prisma = new PrismaClient();

export async function saveConfiguration(req: Request, res: Response) {
  try {
    const requestBody = req.body;

    const updatedProject = await prisma.project.upsert({
      where: { name: requestBody.name },
      update: {
        // updatedAt: new Date(),
        blocks: {
          deleteMany: {},
          create: requestBody.blocks.map((block: any) => ({
            id: block.id || new ObjectId().toHexString(),
            type: block.type,
            attributes: block.attributes,
          })),
        },
        transitions: {
          deleteMany: {},
          create: requestBody.transitions.map((transition: any) => ({
            fromBlockId: transition.fromBlockId,
            toBlockId: transition.toBlockId,
            condition: transition.condition,
          })),
        },
      },
      create: {
        name: requestBody.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        blocks: {
          create: requestBody.blocks.map((block: any) => ({
            id: block.id || new ObjectId().toHexString(),
            type: block.type,
            attributes: block.attributes,
          })),
        },
        transitions: {
          create: requestBody.transitions.map((transition: any) => ({
            fromBlockId: transition.fromBlockId,
            toBlockId: transition.toBlockId,
            condition: transition.condition,
          })),
        },
      },
    });
    res.status(200).json({
      message: 'Project configuration saved successfully',
      data: updatedProject,
    });
  } catch (error) {
    console.error('Error saving project configuration:', error);
    res.status(500).json({
      message: 'Failed to save project configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getAllConfigurations(req: Request, res: Response) {
  try {
    const project = await prisma.project.findMany({
      include: {
        blocks: true,
        transitions: true,
      },
    });

    if (!project) {
      return res.status(404).json({
        message: 'Project not found',
      });
    }

    res.status(200).json({
      message: 'Project configuration retrieved successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error retrieving project configuration:', error);
    res.status(500).json({
      message: 'Failed to retrieve project configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getConfiguration(req: Request, res: Response) {
  try {
    // Извлекаем имя проекта из тела запроса
    const { name } = req.body;

    if (!name) {
      res.status(400).json({
        message: 'Project name is required',
      });
      return; // Завершаем выполнение функции
    }

    // Ищем проект в базе данных
    const project = await prisma.project.findMany({
      where: { name },
      include: {
        blocks: true,
        transitions: true,
      },
    });

    if (!project || project.length === 0) {
      res.status(404).json({
        message: 'Project not found',
      });
      return; // Завершаем выполнение функции
    }

    // Успешный ответ
    res.status(200).json({
      message: 'Project configuration retrieved successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error retrieving project configuration:', error);

    res.status(500).json({
      message: 'Failed to retrieve project configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function deleteConfiguration(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // Извлекаем имя проекта из тела запроса
    const { name } = req.body;

    if (!name) {
      res.status(400).json({
        message: 'Project name is required',
      });
      return; // Завершаем выполнение функции
    }

    // Находим проект по имени
    const project = await prisma.project.findFirst({
      where: { name },
    });

    if (!project) {
      res.status(404).json({
        message: 'Project not found',
      });
      return; // Завершаем выполнение функции
    }

    // Удаление данных проекта в транзакции
    await prisma.$transaction([
      prisma.transition.deleteMany({ where: { projectId: project.id } }),
      prisma.block.deleteMany({ where: { projectId: project.id } }),
      prisma.project.delete({ where: { id: project.id } }),
    ]);

    // Успешный ответ
    res.status(200).json({
      message: 'Project and related data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project configuration:', error);

    res.status(500).json({
      message: 'Failed to delete project configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

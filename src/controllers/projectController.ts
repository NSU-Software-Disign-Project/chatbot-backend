import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Сохранение конфигурации проекта
export const saveConfiguration = async (req: Request, res: Response) => {
  try {
    const { name, blocks, transitions } = req.body;

    // Создаем или обновляем проект
    const Project = await prisma.project.upsert({
      where: {
        // Если у вас только один проект, можно использовать фиксированный ID
        id: req.body.id || '1',
      },
      update: {
        name,
        blocks: {
          deleteMany: {}, // Удаляем старые блоки
          create: blocks.map((block: any) => ({
            type: block.type,
            attributes: block.attributes,
          })),
        },
      },
      create: {
        name,
        blocks: {
          create: blocks.map((block: any) => ({
            type: block.type,
            attributes: block.attributes,
          })),
        },
      },
      include: {
        blocks: true,
      },
    });

    // Создаем переходы между блоками
    if (transitions && transitions.length > 0) {
      await prisma.transition.createMany({
        data: transitions.map((transition: any) => ({
          fromBlockId: transition.fromBlockId,
          toBlockId: transition.toBlockId,
          condition: transition.condition,
        })),
      });
    }

    res.status(200).json({
      message: 'Project configuration saved successfully',
      data: Project,
    });
  } catch (error) {
    console.error('Error saving project configuration:', error);
    res.status(500).json({
      message: 'Failed to save project configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Получение конфигурации проекта
export const getConfiguration = async (req: Request, res: Response) => {
  try {
    const Project = await prisma.project.findFirst({
      include: {
        blocks: {
          include: {
            transitions: true,
          },
        },
      },
    });

    if (!Project) {
      return res.status(404).json({
        message: 'Project not found',
      });
    }

    res.status(200).json({
      message: 'Project configuration retrieved successfully',
      data: Project,
    });
  } catch (error) {
    console.error('Error retrieving project configuration:', error);
    res.status(500).json({
      message: 'Failed to retrieve project configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

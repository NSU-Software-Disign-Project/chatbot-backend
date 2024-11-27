import { Prisma, PrismaClient } from '@prisma/client';
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';

// Инициализация
dotenv.config();
const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Контроллеры
async function saveConfiguration(req: Request, res: Response) {
  try {
    const requestBody = req.body;

    const updatedProject = await prisma.project.upsert({
      where: { name: requestBody.name },
      update: {
        // updatedAt: new Date(),
        blocks: {
          deleteMany: {},
          create: requestBody.blocks.map((block: any) => ({
            id: block.id,
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
        id: new ObjectId().toString(),
        name: requestBody.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        blocks: {
          create: requestBody.blocks.map((block: any) => ({
            id: block.id,
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

async function getConfiguration(req: Request, res: Response) {
  try {
    const project = await prisma.project.findFirst({
      where: {
        name: req.body.name,
      },
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

async function deleteConfiguration(req: Request, res: Response) {
  try {
    const project = await prisma.project.findFirst({
      where: {
        name: req.body.name,
      },
    });

    if (!project) {
      return res.status(404).json({
        message: 'Project not found',
      });
    }

    const deletedProject = await prisma.$transaction([
      prisma.transition.deleteMany({ where: { projectId: project.id } }),
      prisma.block.deleteMany({ where: { projectId: project.id } }),
      prisma.project.delete({ where: { id: project.id } }),
    ]);

    res.status(200).json({ 
      message: "Project and related data deleted successfully", 
      data: deletedProject
    });
  } catch (error) {
    console.error('Error deleting project configuration:', error);
    res.status(500).json({
      message: 'Failed to delete project configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Routes
const router = express.Router();
router.post("/save-config", saveConfiguration);
router.get("/get-config", getConfiguration);
router.delete("/delete-config", deleteConfiguration);

// Подключаем маршруты к приложению
app.use('/api', router);

// Обработка ошибок Prisma
const prismaErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(400).json({
      message: 'Database error',
      error: err.message
    });
    return;
  }
  next(err);
};

app.use(prismaErrorHandler);

// Обработка 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Глобальная обработка ошибок
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Запуск сервера
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing HTTP server and Prisma Client...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
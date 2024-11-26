import { Prisma, PrismaClient } from '@prisma/client';
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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
    const { name, blocks, transitions } = req.body;

    // Создаем или обновляем проект
    const project = await prisma.project.upsert({
      where: {
        name: name,
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
        transitions: {
          deleteMany: {}, // Удаляем старые переходы
          create: transitions.map((transition: any) => ({
            fromBlockId: transition.fromBlockId,
            toBlockId: transition.toBlockId,
            condition: transition.condition,
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

    const blockIds = project.blocks.map(block => block.id);

    if (transitions && transitions.length > 0) {
      await prisma.transition.createMany({
        data: transitions.map((transition: any) => ({
          fromBlockId: blockIds[parseInt(transition.fromBlockId) - 1],
          toBlockId: blockIds[parseInt(transition.toBlockId) - 1],
          condition: transition.condition,
        })),
      });
    }

    res.status(200).json({
      message: 'Project configuration saved successfully',
      data: project,
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
        blocks: {
          include: {
            transitions: true,
          },
        },
      }
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

// Routes
const router = express.Router();
router.post("/save-config", saveConfiguration);
router.get("/get-config", getConfiguration);

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
import { PrismaClient } from '@prisma/client';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import configurationRoute from './boundary/routes/configurationRoute';
import authRoute from './boundary/routes/authRoute';
import {
  prismaErrorHandler,
  serverErrorHandler,
} from './services/errorHandler';
import { shutdownServer } from './services/shutDownServer';
import { createServer } from 'http';
import { WebSocketService } from './boundary/websocket/WebSocketService';

// Инициализация
dotenv.config();
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

const prisma = new PrismaClient();
const app = express();

// Промежуточное ПО
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'https://chatbot-editor.ddns.net',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    credentials: true,
  }),
);

// Резервное промежуточное ПО для парсинга text/plain как JSON
app.use((req, _res, next) => {
  if (
    req.headers['content-type'] &&
    req.headers['content-type'].startsWith('text/plain')
  ) {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        req.body = JSON.parse(data);
      } catch (e) {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

// Конечная точка проверки состояния
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Запуск сервера
const server = createServer(app);
const PORT = process.env.PORT || 8080;

const socketServer = new WebSocketService(server);

// Make WebSocket service available globally
(global as any).socketServer = socketServer;

// Routes
app.use('/api', configurationRoute);
app.use('/auth', authRoute);

// Обработка ошибок Prisma
app.use(prismaErrorHandler);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use(serverErrorHandler);

socketServer.start();

server
  .listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`WebSocket доступен на ws://localhost:${PORT}`);
    console.log(
      `Пространство имен для совместного редактирования: ws://localhost:${PORT}/project`,
    );
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Сервер готов к работе и ожидает подключений...`);
    console.log(`Для остановки сервера нажмите Ctrl+C`);
  })
  .on('error', (err) => {
    console.error('Ошибка при запуске сервера:', err);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing HTTP server and Prisma Client...');
  shutdownServer(server, prisma, socketServer);
});
process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing HTTP server and Prisma Client...');
  shutdownServer(server, prisma, socketServer);
});

// Обработка необработанных исключений
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdownServer(server, prisma, socketServer);
});

export default app;

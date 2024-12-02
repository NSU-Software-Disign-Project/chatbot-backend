import { PrismaClient } from '@prisma/client';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import configurationRoute from './routes/configurationRoute';
import { prismaErrorHandler, serverErrorHandler } from './services/errorHandler';
import { shutdownServer } from './services/shutDownServer';
import { Server as WebSocketServer } from 'ws';
import http from 'http';
import { ChatInterpreter } from './interpreter/interpreter';

// Initialize
dotenv.config();
const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api', configurationRoute);

// Обработка ошибок Prisma
app.use(prismaErrorHandler);

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use(serverErrorHandler);

const PORT = process.env.PORT || 3000;

// Создание HTTP-сервера
const server = http.createServer(app);

// Создание WebSocket-сервера
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  // Обработка сообщений от клиента
  ws.on('message', (message) => {
    try {
      const { action, data } = JSON.parse(message.toString());

      if (action === 'startChat') {
        // Инициализация интерпретатора
        const chat = new ChatInterpreter(data);

        // Callback для отправки данных клиенту
        chat.onMessage = (msg: string) => {
          ws.send(JSON.stringify({ type: 'chatMessage', message: msg }));
        };

        // Callback для завершения чата
        chat.onEnd = () => {
          ws.send(JSON.stringify({ type: 'endChat' }));
          ws.close();
        };

        // Запуск интерпретатора
        chat.start();
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid request format' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing HTTP server and Prisma Client...');
  shutdownServer(server, prisma);
});
process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing HTTP server and Prisma Client...');
  shutdownServer(server, prisma);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdownServer(server, prisma);
});

export default app;

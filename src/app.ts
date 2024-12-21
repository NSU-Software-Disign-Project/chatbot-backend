import { PrismaClient } from '@prisma/client';
import express, {
  Request,
  Response
} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import configurationRoute from './boundary/routes/configurationRoute';
import {
  prismaErrorHandler,
  serverErrorHandler,
} from './services/errorHandler';
import { shutdownServer } from './services/shutDownServer';
import { createServer } from 'http';
import { WebSocketService } from './control/WebSocketService';

// Initialize
dotenv.config();
const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "DELETE", "PUT", "PATCH"]
}));

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

// Start server
const server = createServer(app);
const PORT = process.env.PORT || 3000;

const socketServer = new WebSocketService(server);
socketServer.start();

server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
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

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdownServer(server, prisma, socketServer);
});

export default app;

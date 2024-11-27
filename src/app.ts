import { Prisma, PrismaClient } from '@prisma/client';
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import configurationRoute from './routes/configurationRoute';
import { prismaErrorHandler, serverErrorHandler } from './services/errorHandler';
import { shutdownServer } from './services/shutDownServer';

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

// Start server
const server = app.listen(PORT, () => {
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

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdownServer(server, prisma);
});

export default app;
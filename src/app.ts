import { prisma } from './control/db/database';
import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import configurationRoute from './boundary/routes/configurationRoute';
import {
  prismaErrorHandler,
  serverErrorHandler,
} from './services/handlers/errorHandler';
import { shutdown } from './services/handlers/shutDownServer';
import { createServer, Server } from 'http';
import { WebSocketService } from './boundary/websocket/WebSocketService';
import authRoute from './boundary/routes/authRoute';
import userRoute from './boundary/routes/userRoute';
import projectRoute from './boundary/routes/projectRoute';

// Initialize
dotenv.config();
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

const app = express();
const server = createServer(app);
const socketServer = new WebSocketService(server);

async function main() {
// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://chatbot-editor.ddns.net',
  methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
  credentials: true
}));

// Routes
app.use('/api', configurationRoute);
app.use('/auth', authRoute);
app.use('/user', userRoute);
  app.use('/projects', projectRoute);

  // 404 Handler - must be after all routes
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(404).json({ message: 'Route not found' });
});

  // Error Handlers - must be last
  app.use(prismaErrorHandler as ErrorRequestHandler);
  app.use(serverErrorHandler as ErrorRequestHandler);

  // Start WebSocket Server
socketServer.start();

  // Start HTTP Server
  const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  });
}

// Graceful Shutdown Logic
const cleanup = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  shutdown(server, prisma, socketServer);
};

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  cleanup('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  cleanup('uncaughtException');
});

// Connect to Database and start the server
console.log('Подключение к MongoDB...');
prisma
  .$connect()
  .then(() => {
    console.log('✅ Клиент Prisma подключен. Проверка связи с базой данных...');
    return prisma.$runCommandRaw({ ping: 1 });
  })
  .then(() => {
    console.log('✅ Пинг MongoDB успешен. База данных готова.');
    main();
  })
  .catch((err) => {
    console.error('❌ Ошибка подключения к MongoDB:');
    if (err.code === 'P1003' || (err.code === 'P2010' && err.meta?.message?.includes('Connection refused'))) {
      console.error(
        '   Совет: База данных недоступна. Убедитесь, что контейнер MongoDB запущен (`docker-compose up -d`).',
      );
    } else {
      console.error(err);
    }
    prisma.$disconnect();
    process.exit(1);
});

export default app;

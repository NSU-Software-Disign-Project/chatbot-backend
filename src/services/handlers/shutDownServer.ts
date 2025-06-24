import { WebSocketService } from '../../boundary/websocket/WebSocketService';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';

let isShuttingDown = false;

export const shutdown = async (
  server: Server,
  prisma: PrismaClient,
  socketServer: WebSocketService,
) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('Closing resources...');

  // Promise для закрытия HTTP сервера
  const serverClosePromise = new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) return reject(err);
      console.log('HTTP server closed.');
      resolve();
    });
  });

  // Promise для закрытия WebSocket сервера
  const socketClosePromise = new Promise<void>((resolve) => {
    socketServer.stop();
    // Даем небольшую задержку, чтобы stop успел выполниться
    setTimeout(() => {
        console.log('WebSocket server stopped.');
        resolve();
    }, 500);
  });
  
  // Promise для отключения от БД
  const prismaDisconnectPromise = prisma.$disconnect().then(() => {
      console.log('Prisma client disconnected.');
  });

  const allPromises = Promise.allSettled([
    serverClosePromise,
    socketClosePromise,
    prismaDisconnectPromise,
  ]);
  
  // Таймаут для всего процесса
  const timeoutPromise = new Promise<void>((resolve, reject) => {
    setTimeout(() => reject(new Error('Graceful shutdown timed out')), 8000);
  });

  try {
    await Promise.race([allPromises, timeoutPromise]);
    console.log('Graceful shutdown complete.');
        process.exit(0);
  } catch (error: any) {
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
};
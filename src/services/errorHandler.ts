import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Request, Response, NextFunction } from 'express';

// Обработка ошибок Prisma
export function prismaErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof PrismaClientKnownRequestError) {
    // Обработка известных ошибок Prisma
    res.status(400).json({ message: err.message });
  } else {
    next(err);
  }
}

// Обработка глобальных ошибок сервера
export function serverErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
}